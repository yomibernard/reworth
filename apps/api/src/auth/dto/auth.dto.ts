import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DevicePlatform } from '@prisma/client';

export class DeviceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}

export class OtpRequestDto {
  @IsString()
  @MinLength(8)
  phone!: string;
}

export class OtpVerifyDto {
  @IsString()
  @MinLength(8)
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceDto)
  device?: DeviceDto;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceDto)
  device?: DeviceDto;
}

export class RefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class OAuthCallbackDto {
  @IsOptional()
  @IsString()
  idToken?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceDto)
  device?: DeviceDto;
}
