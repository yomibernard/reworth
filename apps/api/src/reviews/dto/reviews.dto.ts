import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  overall!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  accuracy!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  communication!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  punctuality!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  transactionExperience!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  photoKeys?: string[];
}

export class ReplyReviewDto {
  @IsString()
  @MaxLength(200)
  text!: string;
}

export class ReportReviewDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
