import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { IdentityMethod } from '@prisma/client';

export class IdentityVerifyDto {
  @IsEnum(IdentityMethod)
  method!: IdentityMethod;

  @IsOptional()
  @IsIn(['success', 'failure'])
  mockOutcome?: 'success' | 'failure';

  /** Dev-only opaque mock ref — never a real NIN/BVN. */
  @IsOptional()
  @IsString()
  mockReference?: string;
}
