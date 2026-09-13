import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DisputeReason, DisputeResolution } from '@prisma/client';

export class OpenDisputeDto {
  @IsEnum(DisputeReason)
  reason!: DisputeReason;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  detail?: string;
}

export class DisputeEvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;

  @IsOptional()
  @IsString()
  imageKey?: string;
}

export class SellerResponseDto {
  @IsString()
  @MaxLength(4000)
  text!: string;
}

export class ResolveDisputeDto {
  @IsEnum(DisputeResolution)
  resolution!: DisputeResolution;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountKobo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;
}
