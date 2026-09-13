export type RoomScanDetection = {
  label: string;
  brandHint?: string;
  categoryHint?: string;
  cropKey?: string;
  bbox?: { x: number; y: number; w: number; h: number };
  confidence: number;
};

export interface RoomScanVisionProvider {
  readonly name: string;
  detect(photoKeys: string[]): Promise<RoomScanDetection[]>;
}

export const ROOM_SCAN_VISION_PROVIDER = Symbol('ROOM_SCAN_VISION_PROVIDER');

/** PRD §53 fixed 6-item living-room fixture (deterministic mock). */
export const PRD_ROOM_SCAN_FIXTURE: RoomScanDetection[] = [
  {
    label: 'Samsung television',
    brandHint: 'Samsung',
    categoryHint: 'Electronics',
    cropKey: 'mock/crop/samsung-tv.jpg',
    bbox: { x: 0.1, y: 0.1, w: 0.4, h: 0.35 },
    confidence: 0.96,
  },
  {
    label: 'LG soundbar',
    brandHint: 'LG',
    categoryHint: 'Electronics',
    cropKey: 'mock/crop/lg-soundbar.jpg',
    bbox: { x: 0.15, y: 0.45, w: 0.35, h: 0.08 },
    confidence: 0.93,
  },
  {
    label: 'Dining table',
    categoryHint: 'Furniture',
    cropKey: 'mock/crop/dining-table.jpg',
    bbox: { x: 0.45, y: 0.4, w: 0.4, h: 0.35 },
    confidence: 0.91,
  },
  {
    label: '6 dining chairs',
    categoryHint: 'Furniture',
    cropKey: 'mock/crop/dining-chairs.jpg',
    bbox: { x: 0.5, y: 0.35, w: 0.35, h: 0.4 },
    confidence: 0.88,
  },
  {
    label: 'Coffee table',
    categoryHint: 'Furniture',
    cropKey: 'mock/crop/coffee-table.jpg',
    bbox: { x: 0.2, y: 0.55, w: 0.25, h: 0.2 },
    confidence: 0.9,
  },
  {
    label: 'Floor lamp',
    categoryHint: 'Home',
    cropKey: 'mock/crop/floor-lamp.jpg',
    bbox: { x: 0.75, y: 0.2, w: 0.12, h: 0.5 },
    confidence: 0.87,
  },
];
