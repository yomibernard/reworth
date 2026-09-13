import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ItemCondition, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProAccountsService } from './pro-accounts.service';
import { BulkUploadDto } from './dto/pro.dto';

const CONDITIONS = new Set(Object.values(ItemCondition));

export type BulkRowError = { row: number; message: string };

export type ParsedBulkRow = {
  row: number;
  title: string;
  priceNaira: number;
  condition: ItemCondition;
  community: string;
  categorySlug: string;
  brand?: string;
  model?: string;
  description?: string;
};

@Injectable()
export class BulkUploadService {
  private readonly logger = new Logger(BulkUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly proAccounts: ProAccountsService,
  ) {}

  maxRows(): number {
    return Number(this.config.get<string>('BULK_UPLOAD_MAX_ROWS') ?? '50');
  }

  parseCsv(csv: string): { rows: ParsedBulkRow[]; errors: BulkRowError[] } {
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) {
      throw new BadRequestException('CSV is empty');
    }

    let start = 0;
    const header = lines[0].toLowerCase();
    if (header.includes('title') && header.includes('price')) {
      start = 1;
    }

    const dataLines = lines.slice(start);
    if (dataLines.length > this.maxRows()) {
      throw new BadRequestException(
        `CSV exceeds max ${this.maxRows()} rows (got ${dataLines.length})`,
      );
    }

    const rows: ParsedBulkRow[] = [];
    const errors: BulkRowError[] = [];

    dataLines.forEach((line, idx) => {
      const rowNum = start + idx + 1;
      const cols = this.splitCsvLine(line);
      const title = (cols[0] ?? '').trim();
      const priceRaw = (cols[1] ?? '').trim();
      const conditionRaw = (cols[2] ?? 'GOOD').trim().toUpperCase();
      const community = (cols[3] ?? '').trim();
      const categorySlug = (cols[4] ?? '').trim().toLowerCase();
      const brand = (cols[5] ?? '').trim() || undefined;
      const model = (cols[6] ?? '').trim() || undefined;
      const description = (cols[7] ?? '').trim() || undefined;

      if (!title) {
        errors.push({ row: rowNum, message: 'title required' });
        return;
      }
      if (!priceRaw) {
        errors.push({ row: rowNum, message: 'invalid priceNaira' });
        return;
      }
      const priceNaira = Number(priceRaw);
      if (!Number.isFinite(priceNaira) || priceNaira < 0) {
        errors.push({ row: rowNum, message: 'invalid priceNaira' });
        return;
      }
      if (!CONDITIONS.has(conditionRaw as ItemCondition)) {
        errors.push({ row: rowNum, message: `invalid condition ${conditionRaw}` });
        return;
      }
      if (!categorySlug) {
        errors.push({ row: rowNum, message: 'categorySlug required' });
        return;
      }

      rows.push({
        row: rowNum,
        title,
        priceNaira,
        condition: conditionRaw as ItemCondition,
        community,
        categorySlug,
        brand,
        model,
        description,
      });
    });

    return { rows, errors };
  }

  async upload(userId: string, dto: BulkUploadDto) {
    const account = await this.proAccounts.assertActivePro(userId);
    if (account.status === 'SUSPENDED') {
      throw new BadRequestException('Pro account suspended — bulk upload blocked');
    }

    const { rows, errors } = this.parseCsv(dto.csv);

    const job = await this.prisma.bulkUploadJob.create({
      data: {
        userId,
        proAccountId: account.id,
        status: 'PROCESSING',
        rowCount: rows.length + errors.length,
        errorCount: errors.length,
        errorsJson: errors as unknown as Prisma.InputJsonValue,
      },
    });

    // Sync processor (BullMQ optional later)
    let successCount = 0;
    const createErrors: BulkRowError[] = [...errors];

    for (const row of rows) {
      try {
        const category = await this.prisma.category.findFirst({
          where: { slug: row.categorySlug },
        });
        if (!category) {
          createErrors.push({
            row: row.row,
            message: `unknown categorySlug ${row.categorySlug}`,
          });
          continue;
        }

        const isLuxury = category.slug === 'luxury';
        await this.prisma.listing.create({
          data: {
            sellerId: userId,
            title: row.title,
            description: row.description ?? '',
            categoryId: category.id,
            brand: row.brand,
            model: row.model,
            condition: row.condition,
            priceKobo: Math.round(row.priceNaira * 100),
            community: row.community,
            status: 'DRAFT',
            authRequired: isLuxury,
            authenticationStatus: isLuxury ? 'REQUIRED' : 'NOT_REQUIRED',
          },
        });
        successCount++;
      } catch (err) {
        createErrors.push({
          row: row.row,
          message: (err as Error).message,
        });
      }
    }

    const updated = await this.prisma.bulkUploadJob.update({
      where: { id: job.id },
      data: {
        status: createErrors.length && !successCount ? 'FAILED' : 'COMPLETED',
        successCount,
        errorCount: createErrors.length,
        errorsJson: createErrors as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log({
      event: 'bulk_upload.completed',
      jobId: job.id,
      successCount,
      errorCount: createErrors.length,
    });

    return updated;
  }

  private splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out;
  }
}
