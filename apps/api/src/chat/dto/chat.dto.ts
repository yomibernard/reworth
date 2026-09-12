import { MessageType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  listingId!: string;
}

export class PostMessageDto {
  @IsEnum(MessageType)
  type!: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  imageKey?: string;

  @IsOptional()
  @IsUUID()
  listingCardId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientMsgId?: string;
}

export class ReportUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detail?: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class MuteConversationDto {
  @IsOptional()
  @IsUUID()
  mutedId?: string;
}
