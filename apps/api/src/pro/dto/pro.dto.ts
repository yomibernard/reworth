import { IsObject, IsOptional, IsString, IsArray, MaxLength, MinLength } from 'class-validator';

export class ProApplyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  businessName!: string;

  @IsOptional()
  @IsObject()
  businessDetails?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sampleListingIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  applicationNotes?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  handle?: string;
}

export class BulkUploadDto {
  /** Raw CSV text: title,priceNaira,condition,community,categorySlug,... */
  @IsString()
  @MinLength(1)
  csv!: string;
}

export class AdminProDecisionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
