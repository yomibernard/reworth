import { IsString, IsUUID, MinLength } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}
