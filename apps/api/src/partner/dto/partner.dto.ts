import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AdminCreateEstatePartnerDto {
  @IsUUID()
  communityId!: string;

  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsEmail()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;
}

export class PartnerMemberSyncDto {
  @IsString()
  @MinLength(1)
  eventId!: string;

  @IsIn(['member.join', 'member.leave'])
  eventType!: 'member.join' | 'member.leave';

  @ValidateIf((o: PartnerMemberSyncDto) => !o.userId)
  @IsString()
  @MinLength(7)
  userPhone?: string;

  @ValidateIf((o: PartnerMemberSyncDto) => !o.userPhone)
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

export class PartnerApproveMembershipDto {
  @IsUUID()
  membershipId!: string;

  @IsOptional()
  @IsIn(['APPROVED', 'MEMBER', 'SUSPENDED'])
  status?: 'APPROVED' | 'MEMBER' | 'SUSPENDED';
}
