import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { FulfilmentMethod } from '@prisma/client';

export class CreateOrderDto {
  @IsUUID()
  listingId!: string;

  @IsOptional()
  @IsUUID()
  offerId?: string;

  @IsOptional()
  @IsUUID()
  orderIntentId?: string;

  @IsEnum(FulfilmentMethod)
  fulfilmentMethod!: FulfilmentMethod;

  @IsOptional()
  @IsBoolean()
  buyNow?: boolean;

  /** Optional destination for DELIVERY — quotes fee at create time. */
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  toLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  toLng?: number;

  @IsOptional()
  @IsUUID()
  meetPointId?: string;
}
