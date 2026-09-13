/** PRD §21 community marketplace examples (Phase 2.2). */
export const PHASE22_COMMUNITY_SEEDS: Array<{
  slug: string;
  name: string;
  type: 'ESTATE' | 'CORPORATE' | 'CHURCH' | 'ALUMNI' | 'PUBLIC';
  privacy: 'PUBLIC' | 'SEMI_PRIVATE' | 'PRIVATE';
  about: string;
  geoLat: number;
  geoLng: number;
  verified?: boolean;
}> = [
  {
    slug: 'banana-island',
    name: 'Banana Island Marketplace',
    type: 'ESTATE',
    privacy: 'PRIVATE',
    about: 'Private estate marketplace for Banana Island residents.',
    geoLat: 6.4667,
    geoLng: 3.45,
    verified: true,
  },
  {
    slug: 'vgc',
    name: 'VGC Marketplace',
    type: 'ESTATE',
    privacy: 'PRIVATE',
    about: 'Victoria Garden City verified resident marketplace.',
    geoLat: 6.425,
    geoLng: 3.535,
    verified: true,
  },
  {
    slug: 'lekki-phase-1',
    name: 'Lekki Phase 1 Marketplace',
    type: 'ESTATE',
    privacy: 'SEMI_PRIVATE',
    about: 'Lekki Phase 1 community listings with membership trust.',
    geoLat: 6.4474,
    geoLng: 3.4721,
    verified: true,
  },
  {
    slug: 'eko-atlantic',
    name: 'Eko Atlantic Community',
    type: 'ESTATE',
    privacy: 'PRIVATE',
    about: 'Eko Atlantic resident recommerce hub.',
    geoLat: 6.4,
    geoLng: 3.4,
    verified: true,
  },
  {
    slug: 'corporate',
    name: 'Corporate Marketplace',
    type: 'CORPORATE',
    privacy: 'SEMI_PRIVATE',
    about: 'Employer-verified corporate relocation & office clearouts.',
    geoLat: 6.4281,
    geoLng: 3.4219,
  },
  {
    slug: 'church',
    name: 'Church Marketplace',
    type: 'CHURCH',
    privacy: 'SEMI_PRIVATE',
    about: 'Faith-community recommerce for congregation members.',
    geoLat: 6.45,
    geoLng: 3.43,
  },
  {
    slug: 'alumni',
    name: 'Alumni Marketplace',
    type: 'ALUMNI',
    privacy: 'SEMI_PRIVATE',
    about: 'Alumni network marketplace — invite or approval required.',
    geoLat: 6.44,
    geoLng: 3.46,
  },
];
