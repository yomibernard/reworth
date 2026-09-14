import { IsOptional, IsString, MinLength } from 'class-validator';

export class AttributeReferralDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsOptional()
  @IsString()
  deviceFingerprintHash?: string;
}
