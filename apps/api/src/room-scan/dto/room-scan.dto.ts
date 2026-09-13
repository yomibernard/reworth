import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomScanDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  photoKeys!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}

export class RoomScanItemPatchDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsBoolean()
  selected?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  condition?: string;
}

export class PatchRoomScanItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomScanItemPatchDto)
  items!: RoomScanItemPatchDto[];
}

export class PublishRoomScanDraftsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  listingIds!: string[];
}
