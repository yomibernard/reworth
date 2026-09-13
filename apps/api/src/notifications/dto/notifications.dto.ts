import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NotificationChannel } from '@prisma/client';
import { ALL_NOTIFICATION_CATEGORIES } from '../notification-categories';

export class PatchPreferencesDto {
  @IsIn(ALL_NOTIFICATION_CATEGORIES as unknown as string[])
  category!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;
}

export class RegisterPushTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(32)
  platform!: string;
}

export class ListNotificationsQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unread?: string;
}
