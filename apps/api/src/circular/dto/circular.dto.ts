import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCircularPartnerDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsIn(['CHARITY', 'RECYCLER'])
  kind!: 'CHARITY' | 'RECYCLER';

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  acceptedCategories?: string[];

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}

export class UpdateCircularPartnerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsIn(['CHARITY', 'RECYCLER'])
  kind?: 'CHARITY' | 'RECYCLER';

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedCategories?: string[];

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ScheduleHandoffDto {
  @IsUUID()
  listingId!: string;

  @IsUUID()
  circularPartnerId!: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  recipientLabel?: string;
}

export class SetDonateIfUnsoldDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  donateIfUnsoldDays?: number | null;

  @IsOptional()
  @IsUUID()
  preferredPartnerId?: string;
}
