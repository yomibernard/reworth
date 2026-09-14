import {
  PRD_ROOM_SCAN_FIXTURE,
  type RoomScanDetection,
  type RoomScanVisionProvider,
} from './room-scan-vision.provider';

/** Mock vision — always returns the fixed PRD 6 detections for any input. */
export class MockRoomScanVisionProvider implements RoomScanVisionProvider {
  readonly name = 'mock-room-scan-vision';

  async detect(_photoKeys: string[]): Promise<RoomScanDetection[]> {
    return PRD_ROOM_SCAN_FIXTURE.map((d) => ({ ...d }));
  }
}
