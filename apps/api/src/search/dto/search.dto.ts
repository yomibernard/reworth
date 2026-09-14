import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMinKobo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMaxKobo?: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  community?: string;

  @IsOptional()
  @IsString()
  communityId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsIn([2, 5, 10, 25])
  radiusKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deliveryAvailable?: boolean;

  @IsOptional()
  @IsString()
  listedAfter?: string;

  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc', 'distance'])
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'distance';

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class NlSearchDto {
  @IsString()
  query!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
