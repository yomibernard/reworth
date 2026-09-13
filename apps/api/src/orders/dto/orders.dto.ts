import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
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
}
