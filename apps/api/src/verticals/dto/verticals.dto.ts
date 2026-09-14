import { IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RequestInspectionDto {
  @IsOptional()
  @IsString()
  slotLabel?: string;
}

export class ScheduleInspectionDto {
  @IsOptional()
  @IsString()
  slotLabel?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class InspectionWebhookDto {
  @IsOptional()
  @IsString()
  partnerRef?: string;

  @IsOptional()
  @IsUUID()
  inspectionId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  conditionScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  verifiedMileage?: number;

  @IsOptional()
  @IsString()
  accidentNotes?: string;

  @IsOptional()
  @IsString()
  tyreBatteryNotes?: string;

  @IsOptional()
  @IsBoolean()
  registrationOk?: boolean;

  @IsOptional()
  reportPhotos?: unknown[];

  @IsOptional()
  @IsObject()
  reportChecklist?: Record<string, unknown>;
}

export class AuthWebhookDto {
  @IsOptional()
  @IsString()
  partnerRef?: string;

  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  certificateId?: string;

  @IsOptional()
  @IsString()
  failReason?: string;

  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;
}
