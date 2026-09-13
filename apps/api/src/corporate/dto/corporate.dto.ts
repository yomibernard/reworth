import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CorporateApplyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  billingContact!: string;

  @IsEmail()
  billingEmail!: string;

  @IsOptional()
  @IsString()
  dpaRecordRef?: string;

  @IsOptional()
  @IsString()
  supportTier?: string;
}

export class CreateRelocationProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  employeeName!: string;

  @IsISO8601()
  deadline!: string;

  @IsString()
  cityFrom!: string;

  @IsString()
  cityTo!: string;

  @IsOptional()
  @IsString()
  communityFrom?: string;

  @IsOptional()
  @IsString()
  communityTo?: string;
}

export class IntakeItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ProjectIntakeDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntakeItemDto)
  items?: IntakeItemDto[];

  /** When true, use Persona C 12-item fixture. */
  @IsOptional()
  usePersonaCFixture?: boolean;
}

export class AdminCorporateDecisionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class AdvanceProjectDto {
  @IsOptional()
  @IsString()
  toStatus?: string;
}
