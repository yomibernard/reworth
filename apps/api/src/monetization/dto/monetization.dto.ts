import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class BoostQuoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  hours!: number;
}

export class BoostPurchaseDto {
  @IsUUID()
  listingId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  hours!: number;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

export class FeaturedPurchaseDto {
  @IsUUID()
  listingId!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

export class SellerPlusUpgradeDto {
  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

export class PublishFeeConfigDto {
  @IsObject()
  rates!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  note?: string;
}
