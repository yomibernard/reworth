import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class PresignMediaDto {
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsString()
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  contentLength!: number;

  @IsString()
  fileName!: string;
}

export class CompleteMediaDto {
  @IsString()
  key!: string;

  @IsUUID()
  listingId!: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}
