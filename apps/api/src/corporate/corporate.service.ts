import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CorporateAccountStatus,
  Prisma,
  RelocationProjectStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PERSONA_C_RELOCATION_ITEMS } from './corporate-persona-c.fixture';
import type {
  CorporateApplyDto,
  CreateRelocationProjectDto,
  ProjectIntakeDto,
} from './dto/corporate.dto';

export const PROJECT_TRANSITIONS: Record<
  RelocationProjectStatus,
  RelocationProjectStatus[]
> = {
  DRAFT: ['INTAKE', 'CANCELLED'],
  INTAKE: ['LISTED', 'CANCELLED'],
  LISTED: ['IN_FULFILMENT', 'COMPLETING', 'CANCELLED'],
  IN_FULFILMENT: ['COMPLETING', 'CANCELLED'],
  COMPLETING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class CorporateService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, dto: CorporateApplyDto) {
    const existing = await this.prisma.corporateMembership.findFirst({
      where: { userId },
      include: { corporateAccount: true },
    });
    if (existing) {
      return this.toAccountDto(existing.corporateAccount, existing.role);
    }

    const account = await this.prisma.corporateAccount.create({
      data: {
        companyName: dto.companyName.trim(),
        billingContact: dto.billingContact.trim(),
        billingEmail: dto.billingEmail.trim().toLowerCase(),
        dpaRecordRef: dto.dpaRecordRef,
        supportTier: dto.supportTier ?? 'standard',
        status: 'APPLIED',
        members: {
          create: { userId, role: 'COORDINATOR' },
        },
      },
    });
    return this.toAccountDto(account, 'COORDINATOR');
  }

  async getMine(userId: string) {
    const membership = await this.prisma.corporateMembership.findFirst({
      where: { userId },
      include: {
        corporateAccount: {
          include: {
            projects: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        },
      },
    });
    if (!membership) return { account: null, projects: [] };
    return {
      account: this.toAccountDto(
        membership.corporateAccount,
        membership.role,
      ),
      projects: membership.corporateAccount.projects.map((p) =>
        this.toProjectSummary(p),
      ),
    };
  }

  async createProject(userId: string, dto: CreateRelocationProjectDto) {
    const membership = await this.requireActiveMembership(userId);
    const deadline = new Date(dto.deadline);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      throw new BadRequestException('deadline must be in the future');
    }

    const project = await this.prisma.relocationProject.create({
      data: {
        corporateAccountId: membership.corporateAccountId,
        ownerUserId: userId,
        title: dto.title.trim(),
        employeeName: dto.employeeName.trim(),
        deadline,
        cityFrom: dto.cityFrom.trim(),
        cityTo: dto.cityTo.trim(),
        communityFrom: dto.communityFrom?.trim() ?? '',
        communityTo: dto.communityTo?.trim() ?? '',
        status: 'DRAFT',
      },
    });

    // First approved project → ACTIVE
    if (membership.corporateAccount.status === 'APPROVED') {
      await this.prisma.corporateAccount.update({
        where: { id: membership.corporateAccountId },
        data: { status: 'ACTIVE' },
      });
    }

    return this.getProject(userId, project.id);
  }

  async getProject(userId: string, projectId: string) {
    const project = await this.requireProjectAccess(userId, projectId);
    return this.toProjectDetail(project);
  }

  async intake(userId: string, projectId: string, dto: ProjectIntakeDto) {
    const project = await this.requireProjectAccess(userId, projectId);
    this.assertTransition(project.status, 'INTAKE');

    const fixtureItems = dto.usePersonaCFixture
      ? PERSONA_C_RELOCATION_ITEMS
      : [];
    const rawItems =
      dto.items && dto.items.length > 0
        ? dto.items
        : fixtureItems.map((i) => ({ title: i.title, notes: i.notes }));
    if (!rawItems.length) {
      throw new BadRequestException('items required (or usePersonaCFixture)');
    }

    const geo = await this.prisma.community.findFirst({
      where: {
        OR: [
          { name: { contains: project.communityFrom, mode: 'insensitive' } },
          { slug: { contains: project.communityFrom.toLowerCase() } },
        ],
      },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const movingSale = await tx.movingSale.create({
        data: {
          sellerId: userId,
          title: project.title,
          blurb: `Corporate relocation for ${project.employeeName}`,
          deadline: project.deadline,
          community: project.communityFrom || project.cityFrom,
          geoLat: geo?.geoLat ?? null,
          geoLng: geo?.geoLng ?? null,
          status: 'ACTIVE',
        },
      });

      await tx.relocationProject.update({
        where: { id: project.id },
        data: { status: 'INTAKE', movingSaleId: movingSale.id },
      });

      const createdItems = [];
      for (const item of rawItems) {
        const listing = await tx.listing.create({
          data: {
            sellerId: userId,
            title: item.title.trim(),
            description: item.notes?.trim() || `Relocation item: ${item.title}`,
            condition: 'GOOD',
            sellingMode: 'SELL',
            priceKobo: 0,
            status: 'DRAFT',
            community: project.communityFrom || '',
            city: project.cityFrom,
            movingSaleId: movingSale.id,
            geoLat: geo?.geoLat ?? null,
            geoLng: geo?.geoLng ?? null,
          },
        });
        const row = await tx.relocationItem.create({
          data: {
            projectId: project.id,
            title: item.title.trim(),
            notes: item.notes?.trim() ?? '',
            listingId: listing.id,
          },
        });
        createdItems.push(row);
      }

      await tx.relocationProject.update({
        where: { id: project.id },
        data: { status: 'LISTED' },
      });

      return { movingSaleId: movingSale.id, itemCount: createdItems.length };
    });

    return {
      ...(await this.getProject(userId, projectId)),
      intake: result,
    };
  }

  async complete(userId: string, projectId: string) {
    const project = await this.requireProjectAccess(userId, projectId);
    const from = project.status;
    if (from === 'COMPLETED') {
      return this.toProjectDetail(project);
    }

    const path: RelocationProjectStatus[] = [];
    if (from === 'LISTED') path.push('IN_FULFILMENT', 'COMPLETING', 'COMPLETED');
    else if (from === 'IN_FULFILMENT') path.push('COMPLETING', 'COMPLETED');
    else if (from === 'COMPLETING') path.push('COMPLETED');
    else {
      throw new ConflictException(
        `Cannot complete from status ${from}`,
      );
    }

    let status: RelocationProjectStatus = from;
    for (const next of path) {
      this.assertTransition(status, next);
      status = next;
    }

    const items = await this.prisma.relocationItem.findMany({
      where: { projectId },
      include: { listing: { select: { id: true, status: true, title: true } } },
    });

    const report = {
      projectId,
      completedAt: new Date().toISOString(),
      employeeName: project.employeeName,
      itemCount: items.length,
      listings: items.map((i) => ({
        title: i.title,
        listingId: i.listingId,
        listingStatus: i.listing?.status ?? null,
      })),
      soldCount: items.filter((i) => i.listing?.status === 'SOLD').length,
      remainingDrafts: items.filter((i) => i.listing?.status === 'DRAFT')
        .length,
    };

    const updated = await this.prisma.relocationProject.update({
      where: { id: projectId },
      data: {
        status: 'COMPLETED',
        completionReport: report as Prisma.InputJsonValue,
      },
      include: {
        items: { include: { listing: true } },
        movingSale: true,
      },
    });

    return this.toProjectDetail(updated);
  }

  async generateInvoice(userId: string, projectId: string) {
    const project = await this.requireProjectAccess(userId, projectId);
    if (project.status !== 'COMPLETED' && project.status !== 'COMPLETING') {
      throw new ConflictException('Complete project before invoicing');
    }
    if (project.invoiceNumber && project.settledAt) {
      return {
        invoiceNumber: project.invoiceNumber,
        invoicePdfKey: project.invoicePdfKey,
        settledAt: project.settledAt,
        alreadySettled: true,
      };
    }

    const invoiceNumber = `RW-CORP-${Date.now().toString(36).toUpperCase()}`;
    const pdfBody = [
      '%PDF-1.4 mock',
      `Invoice ${invoiceNumber}`,
      `Company relocation: ${project.title}`,
      `Employee: ${project.employeeName}`,
      `Items: ${(await this.prisma.relocationItem.count({ where: { projectId } }))}`,
      `Issued: ${new Date().toISOString()}`,
      'Amount: coordination fee — see billing contact',
      '%%EOF',
    ].join('\n');
    const invoicePdfKey = `invoices/corporate/${projectId}/${invoiceNumber}.pdf.txt`;
    // Store mock key; body hash for auditability without real S3 in tests
    const contentHash = createHash('sha256').update(pdfBody).digest('hex');

    const updated = await this.prisma.relocationProject.update({
      where: { id: projectId },
      data: {
        invoiceNumber,
        invoicePdfKey: `${invoicePdfKey}#${contentHash.slice(0, 12)}`,
        settledAt: new Date(),
        status: 'COMPLETED',
      },
    });

    return {
      invoiceNumber: updated.invoiceNumber,
      invoicePdfKey: updated.invoicePdfKey,
      settledAt: updated.settledAt,
      mockPdfPreview: pdfBody.slice(0, 200),
      alreadySettled: false,
    };
  }

  async listAdminAccounts(status?: string) {
    const rows = await this.prisma.corporateAccount.findMany({
      where: status
        ? { status: status as CorporateAccountStatus }
        : undefined,
      include: {
        _count: { select: { members: true, projects: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      items: rows.map((a) => ({
        ...this.toAccountDto(a),
        memberCount: a._count.members,
        projectCount: a._count.projects,
      })),
    };
  }

  async approveAccount(adminId: string, accountId: string) {
    const account = await this.prisma.corporateAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('Corporate account not found');
    if (account.status === 'REJECTED') {
      throw new ConflictException('Account was rejected');
    }
    const updated = await this.prisma.corporateAccount.update({
      where: { id: accountId },
      data: {
        status: 'APPROVED',
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    return this.toAccountDto(updated);
  }

  async listAdminProjects(corporateAccountId?: string) {
    const rows = await this.prisma.relocationProject.findMany({
      where: corporateAccountId ? { corporateAccountId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { items: rows.map((p) => this.toProjectSummary(p)) };
  }

  /** Test helper — assert workspace isolation. */
  async assertWorkspaceIsolation(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    try {
      await this.requireProjectAccess(userId, projectId);
      return true;
    } catch (e) {
      if (e instanceof ForbiddenException || e instanceof NotFoundException) {
        return false;
      }
      throw e;
    }
  }

  private assertTransition(
    from: RelocationProjectStatus,
    to: RelocationProjectStatus,
  ) {
    const allowed = PROJECT_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new ConflictException(
        `Invalid project transition ${from} → ${to}`,
      );
    }
  }

  private async requireActiveMembership(userId: string) {
    const membership = await this.prisma.corporateMembership.findFirst({
      where: { userId },
      include: { corporateAccount: true },
    });
    if (!membership) {
      throw new ForbiddenException('Not a corporate member');
    }
    const st = membership.corporateAccount.status;
    if (st !== 'APPROVED' && st !== 'ACTIVE') {
      throw new ForbiddenException(
        `Corporate account status is ${st}; approval required`,
      );
    }
    return membership;
  }

  private async requireProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.relocationProject.findUnique({
      where: { id: projectId },
      include: {
        items: { include: { listing: true } },
        movingSale: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const membership = await this.prisma.corporateMembership.findUnique({
      where: {
        corporateAccountId_userId: {
          corporateAccountId: project.corporateAccountId,
          userId,
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException('Workspace isolation: not a member');
    }
    return project;
  }

  private toAccountDto(
    a: {
      id: string;
      companyName: string;
      billingContact: string;
      billingEmail: string;
      dpaRecordRef: string | null;
      supportTier: string;
      status: CorporateAccountStatus;
      reviewedAt: Date | null;
      createdAt: Date;
    },
    role?: string,
  ) {
    return {
      id: a.id,
      companyName: a.companyName,
      billingContact: a.billingContact,
      billingEmail: a.billingEmail,
      dpaRecordRef: a.dpaRecordRef,
      supportTier: a.supportTier,
      status: a.status,
      reviewedAt: a.reviewedAt,
      createdAt: a.createdAt,
      role: role ?? null,
    };
  }

  private toProjectSummary(p: {
    id: string;
    corporateAccountId: string;
    title: string;
    employeeName: string;
    deadline: Date;
    cityFrom: string;
    cityTo: string;
    status: RelocationProjectStatus;
    invoiceNumber: string | null;
    settledAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: p.id,
      corporateAccountId: p.corporateAccountId,
      title: p.title,
      employeeName: p.employeeName,
      deadline: p.deadline,
      cityFrom: p.cityFrom,
      cityTo: p.cityTo,
      status: p.status,
      invoiceNumber: p.invoiceNumber,
      settledAt: p.settledAt,
      createdAt: p.createdAt,
    };
  }

  private toProjectDetail(
    p: {
      id: string;
      corporateAccountId: string;
      ownerUserId: string;
      title: string;
      employeeName: string;
      deadline: Date;
      cityFrom: string;
      cityTo: string;
      communityFrom: string;
      communityTo: string;
      status: RelocationProjectStatus;
      movingSaleId: string | null;
      completionReport: Prisma.JsonValue | null;
      invoiceNumber: string | null;
      invoicePdfKey: string | null;
      settledAt: Date | null;
      createdAt: Date;
      items?: Array<{
        id: string;
        title: string;
        notes: string;
        listingId: string | null;
      }>;
      movingSale?: { id: string; title: string; status: string } | null;
    },
  ) {
    return {
      ...this.toProjectSummary(p),
      ownerUserId: p.ownerUserId,
      communityFrom: p.communityFrom,
      communityTo: p.communityTo,
      movingSaleId: p.movingSaleId,
      movingSale: p.movingSale
        ? {
            id: p.movingSale.id,
            title: p.movingSale.title,
            status: p.movingSale.status,
          }
        : null,
      completionReport: p.completionReport,
      invoicePdfKey: p.invoicePdfKey,
      items: (p.items ?? []).map((i) => ({
        id: i.id,
        title: i.title,
        notes: i.notes,
        listingId: i.listingId,
      })),
    };
  }
}
