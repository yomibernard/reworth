/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  CorporateService,
  PROJECT_TRANSITIONS,
} from './corporate.service';
import { PERSONA_C_RELOCATION_ITEMS } from './corporate-persona-c.fixture';

describe('Phase 3.2 corporate relocation', () => {
  it('Persona C fixture has 12 household items', () => {
    expect(PERSONA_C_RELOCATION_ITEMS).toHaveLength(12);
    expect(PERSONA_C_RELOCATION_ITEMS.map((i) => i.title).join(' ')).toMatch(
      /TV|sofa|Dining|bed|Microwave|generator|Camry|fridge|Washing|conditioner/i,
    );
  });

  it('project state machine allows DRAFT→INTAKE→LISTED→…→COMPLETED', () => {
    expect(PROJECT_TRANSITIONS.DRAFT).toContain('INTAKE');
    expect(PROJECT_TRANSITIONS.INTAKE).toContain('LISTED');
    expect(PROJECT_TRANSITIONS.LISTED).toContain('IN_FULFILMENT');
    expect(PROJECT_TRANSITIONS.IN_FULFILMENT).toContain('COMPLETING');
    expect(PROJECT_TRANSITIONS.COMPLETING).toContain('COMPLETED');
    expect(PROJECT_TRANSITIONS.COMPLETED).toEqual([]);
  });

  it('workspace isolation: other corporate members cannot see project', async () => {
    const project = {
      id: 'proj-1',
      corporateAccountId: 'corp-a',
      ownerUserId: 'user-a',
      title: 'Move',
      employeeName: 'Ada',
      deadline: new Date(Date.now() + 86400000),
      cityFrom: 'Lagos',
      cityTo: 'Abuja',
      communityFrom: 'Lekki',
      communityTo: 'Maitama',
      status: 'DRAFT' as const,
      movingSaleId: null,
      completionReport: null,
      invoiceNumber: null,
      invoicePdfKey: null,
      settledAt: null,
      createdAt: new Date(),
      items: [],
      movingSale: null,
    };

    const prisma: any = {
      relocationProject: {
        findUnique: jest.fn(async ({ where }: any) =>
          where.id === project.id ? project : null,
        ),
      },
      corporateMembership: {
        findUnique: jest.fn(async ({ where }: any) => {
          const key = where.corporateAccountId_userId;
          if (key.corporateAccountId === 'corp-a' && key.userId === 'user-a') {
            return { id: 'm1', corporateAccountId: 'corp-a', userId: 'user-a' };
          }
          return null;
        }),
      },
    };

    const svc = new CorporateService(prisma);
    await expect(svc.getProject('user-a', 'proj-1')).resolves.toMatchObject({
      id: 'proj-1',
    });
    await expect(svc.getProject('user-b', 'proj-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(await svc.assertWorkspaceIsolation('user-a', 'proj-1')).toBe(true);
    expect(await svc.assertWorkspaceIsolation('user-b', 'proj-1')).toBe(false);
  });

  it('intake creates moving sale + draft listings and lands on LISTED', async () => {
    const account = {
      id: 'corp-1',
      status: 'APPROVED',
      companyName: 'Acme',
      billingContact: 'HR',
      billingEmail: 'hr@acme.test',
      dpaRecordRef: null,
      supportTier: 'standard',
      reviewedAt: null,
      createdAt: new Date(),
    };
    let projectStatus = 'DRAFT';
    const listings: any[] = [];
    const items: any[] = [];

    const prisma: any = {
      corporateMembership: {
        findFirst: jest.fn(async () => ({
          corporateAccountId: account.id,
          userId: 'u1',
          role: 'COORDINATOR',
          corporateAccount: account,
        })),
        findUnique: jest.fn(async () => ({
          corporateAccountId: account.id,
          userId: 'u1',
        })),
      },
      corporateAccount: {
        update: jest.fn(async ({ data }: any) => ({ ...account, ...data })),
      },
      community: { findFirst: jest.fn(async () => null) },
      relocationProject: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'proj-1',
          ...data,
          movingSaleId: null,
          completionReport: null,
          invoiceNumber: null,
          invoicePdfKey: null,
          settledAt: null,
          createdAt: new Date(),
          items: [],
          movingSale: null,
        })),
        findUnique: jest.fn(async () => ({
          id: 'proj-1',
          corporateAccountId: account.id,
          ownerUserId: 'u1',
          title: 'Relo',
          employeeName: 'Chidi',
          deadline: new Date(Date.now() + 7 * 86400000),
          cityFrom: 'Lagos',
          cityTo: 'Abuja',
          communityFrom: 'Lekki',
          communityTo: '',
          status: projectStatus,
          movingSaleId: projectStatus === 'DRAFT' ? null : 'sale-1',
          completionReport: null,
          invoiceNumber: null,
          invoicePdfKey: null,
          settledAt: null,
          createdAt: new Date(),
          items,
          movingSale:
            projectStatus === 'DRAFT'
              ? null
              : { id: 'sale-1', title: 'Relo', status: 'ACTIVE' },
        })),
        update: jest.fn(async ({ data }: any) => {
          projectStatus = data.status ?? projectStatus;
          return { id: 'proj-1', status: projectStatus };
        }),
        count: jest.fn(),
      },
      relocationItem: {
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `item-${items.length}`, ...data };
          items.push(row);
          return row;
        }),
        findMany: jest.fn(async () => items),
        count: jest.fn(async () => items.length),
      },
      movingSale: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'sale-1',
          ...data,
        })),
      },
      listing: {
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `list-${listings.length}`, ...data };
          listings.push(row);
          return row;
        }),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    const svc = new CorporateService(prisma);
    const out = await svc.intake('u1', 'proj-1', {
      items: [{ title: 'TV' }, { title: 'Sofa' }],
    });
    expect(listings).toHaveLength(2);
    expect(listings.every((l) => l.status === 'DRAFT')).toBe(true);
    expect(projectStatus).toBe('LISTED');
    expect(out.intake.itemCount).toBe(2);
  });

  it('rejects illegal status jump DRAFT→COMPLETED', async () => {
    const prisma: any = {
      relocationProject: {
        findUnique: jest.fn(async () => ({
          id: 'p1',
          corporateAccountId: 'c1',
          status: 'DRAFT',
          employeeName: 'X',
          title: 'T',
          items: [],
          movingSale: null,
          ownerUserId: 'u1',
          deadline: new Date(),
          cityFrom: 'Lagos',
          cityTo: 'Abuja',
          communityFrom: '',
          communityTo: '',
          movingSaleId: null,
          completionReport: null,
          invoiceNumber: null,
          invoicePdfKey: null,
          settledAt: null,
          createdAt: new Date(),
        })),
      },
      corporateMembership: {
        findUnique: jest.fn(async () => ({
          corporateAccountId: 'c1',
          userId: 'u1',
        })),
      },
    };
    const svc = new CorporateService(prisma);
    await expect(svc.complete('u1', 'p1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
