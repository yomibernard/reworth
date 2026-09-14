import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class CreateAssistantSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class PostAssistantMessageDto {
  @IsString()
  @MaxLength(4_000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  confirmToken?: string;
}

export class CreateBundleDto {
  @IsString()
  @MaxLength(500)
  brief!: string;

  @IsInt()
  @Min(1)
  budgetKobo!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class SaveBundleDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  listingIds?: string[];
}
