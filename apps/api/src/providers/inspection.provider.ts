export type ScheduleInspectionInput = {
  listingId: string;
  inspectionId: string;
  slotLabel?: string;
  scheduledAt?: Date;
};

export type ScheduleInspectionResult = {
  partnerRef: string;
  scheduledAt: Date;
  slotLabel: string;
};

export type InspectionReportPayload = {
  partnerRef: string;
  inspectionId?: string;
  conditionScore?: number;
  verifiedMileage?: number;
  accidentNotes?: string;
  tyreBatteryNotes?: string;
  registrationOk?: boolean;
  reportPhotos?: unknown[];
  reportChecklist?: Record<string, unknown>;
};

export interface InspectionProvider {
  readonly name: string;
  schedule(input: ScheduleInspectionInput): Promise<ScheduleInspectionResult>;
}

export const INSPECTION_PROVIDER = Symbol('INSPECTION_PROVIDER');
