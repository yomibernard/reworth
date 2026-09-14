import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommunityPrivacy, CommunityType } from '@prisma/client';

export class ListCommunitiesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusKm?: number;

  @IsOptional()
  @IsEnum(CommunityType)
  type?: CommunityType;

  @IsOptional()
  @IsEnum(CommunityPrivacy)
  privacy?: CommunityPrivacy;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CreateCommunityInviteDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxUses?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  expiryDays?: number;
}

export class RedeemInviteDto {
  @IsString()
  @MaxLength(64)
  code!: string;
}

export class AdminPatchCommunityDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(CommunityType)
  type?: CommunityType;

  @IsOptional()
  @IsEnum(CommunityPrivacy)
  privacy?: CommunityPrivacy;

  @IsOptional()
  @IsString()
  coverUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  about?: string;

  @IsOptional()
  verified?: boolean;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  geoLat?: number | null;

  @IsOptional()
  @IsNumber()
  geoLng?: number | null;
}

export class AdminAddManagerDto {
  @IsUUID()
  userId!: string;
}

export class AdminMembershipsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}
