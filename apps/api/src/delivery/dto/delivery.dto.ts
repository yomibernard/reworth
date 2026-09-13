import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryShipmentStatus } from '@prisma/client';

export class DeliveryQuoteQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  toLat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  toLng!: number;
}

export class MeetPointFulfilmentDto {
  @IsUUID()
  meetPointId!: string;
}

export class DeliveryWebhookDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsString()
  providerRef?: string;

  @IsEnum(DeliveryShipmentStatus)
  status!: DeliveryShipmentStatus;

  @IsOptional()
  @IsString()
  failureReason?: string;
}

export class MeetPointsQueryDto {
  @IsOptional()
  @IsString()
  community?: string;
}
