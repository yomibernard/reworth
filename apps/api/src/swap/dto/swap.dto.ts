import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSwapProposalDto {
  @IsUUID()
  offeredListingId!: string;

  /** Positive = proposer pays seller. Default 0 (pure swap). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000_000)
  cashComponentKobo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class CounterSwapProposalDto {
  @IsOptional()
  @IsUUID()
  offeredListingId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000_000)
  cashComponentKobo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateGiveawayClaimDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class FailLegDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
