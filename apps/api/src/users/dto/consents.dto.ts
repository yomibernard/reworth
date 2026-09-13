import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { ConsentChannel } from '@prisma/client';

export class ConsentItemDto {
  @IsEnum(ConsentChannel)
  channel!: ConsentChannel;

  @IsBoolean()
  granted!: boolean;
}

export class UpdateConsentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentItemDto)
  consents!: ConsentItemDto[];
}
