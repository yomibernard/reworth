/**
 * ReWorth Prisma seed — Super Admin + categories (PRD §26) + chat scan rules.
 *
 * Env:
 *   ADMIN_SUPER_EMAIL
 *   ADMIN_SUPER_PASSWORD
 */
import { PrismaClient, AdminRole, ChatScanKind } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { seedRiskAndModeration } from './seed-risk-moderation';
import { PHASE22_COMMUNITY_SEEDS } from '../src/communities/community-seeds';

const prisma = new PrismaClient();

type CategorySeed = {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
};

const CATEGORIES: CategorySeed[] = [
  {
    slug: 'home-furniture',
    name: 'Home & Furniture',
    children: [
      { slug: 'sofas', name: 'Sofas' },
      { slug: 'beds', name: 'Beds' },
      { slug: 'tables-desks', name: 'Tables & Desks' },
      { slug: 'storage', name: 'Storage' },
    ],
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    children: [
      { slug: 'tvs', name: 'TVs' },
      { slug: 'audio', name: 'Audio' },
      { slug: 'cameras', name: 'Cameras' },
      { slug: 'gaming', name: 'Gaming' },
    ],
  },
  {
    slug: 'phones-tablets',
    name: 'Phones & Tablets',
    children: [
      { slug: 'smartphones', name: 'Smartphones' },
      { slug: 'tablets', name: 'Tablets' },
      { slug: 'phone-accessories', name: 'Accessories' },
    ],
  },
  {
    slug: 'computers',
    name: 'Computers',
    children: [
      { slug: 'laptops', name: 'Laptops' },
      { slug: 'desktops', name: 'Desktops' },
      { slug: 'monitors', name: 'Monitors' },
      { slug: 'peripherals', name: 'Peripherals' },
    ],
  },
  {
    slug: 'home-appliances',
    name: 'Home Appliances',
    children: [
      { slug: 'kitchen', name: 'Kitchen' },
      { slug: 'laundry', name: 'Laundry' },
      { slug: 'cooling', name: 'Cooling' },
    ],
  },
  {
    slug: 'vehicles',
    name: 'Vehicles',
    children: [
      { slug: 'cars', name: 'Cars' },
      { slug: 'motorcycles', name: 'Motorcycles' },
      { slug: 'parts', name: 'Parts' },
    ],
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    children: [
      { slug: 'mens', name: "Men's" },
      { slug: 'womens', name: "Women's" },
      { slug: 'shoes', name: 'Shoes' },
    ],
  },
  {
    slug: 'luxury',
    name: 'Luxury',
    children: [
      { slug: 'watches', name: 'Watches' },
      { slug: 'bags', name: 'Bags' },
      { slug: 'jewellery', name: 'Jewellery' },
    ],
  },
  {
    slug: 'children-baby',
    name: 'Children & Baby',
    children: [
      { slug: 'toys', name: 'Toys' },
      { slug: 'strollers', name: 'Strollers' },
      { slug: 'kids-clothing', name: 'Clothing' },
    ],
  },
  {
    slug: 'sports-fitness',
    name: 'Sports & Fitness',
    children: [
      { slug: 'gym', name: 'Gym' },
      { slug: 'outdoor', name: 'Outdoor' },
      { slug: 'bikes', name: 'Bikes' },
    ],
  },
  {
    slug: 'office-equipment',
    name: 'Office Equipment',
    children: [
      { slug: 'printers', name: 'Printers' },
      { slug: 'office-furniture', name: 'Furniture' },
      { slug: 'supplies', name: 'Supplies' },
    ],
  },
  {
    slug: 'tools-equipment',
    name: 'Tools & Equipment',
    children: [
      { slug: 'power-tools', name: 'Power Tools' },
      { slug: 'hand-tools', name: 'Hand Tools' },
      { slug: 'generators', name: 'Generators' },
    ],
  },
  {
    slug: 'books',
    name: 'Books',
    children: [
      { slug: 'fiction', name: 'Fiction' },
      { slug: 'non-fiction', name: 'Non-fiction' },
      { slug: 'textbooks', name: 'Textbooks' },
    ],
  },
  {
    slug: 'collectibles',
    name: 'Collectibles',
    children: [
      { slug: 'art', name: 'Art' },
      { slug: 'memorabilia', name: 'Memorabilia' },
      { slug: 'antiques', name: 'Antiques' },
    ],
  },
  {
    slug: 'garden',
    name: 'Garden',
    children: [
      { slug: 'plants', name: 'Plants' },
      { slug: 'outdoor-furniture', name: 'Outdoor Furniture' },
      { slug: 'garden-tools', name: 'Tools' },
    ],
  },
  {
    slug: 'other',
    name: 'Other',
    children: [
      { slug: 'misc', name: 'Miscellaneous' },
      { slug: 'uncategorised', name: 'Uncategorised' },
    ],
  },
];

async function seedCategories() {
  let sort = 0;
  for (const cat of CATEGORIES) {
    const parentId = randomUUID();
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        id: parentId,
        slug: cat.slug,
        name: cat.name,
        sortOrder: sort++,
      },
      update: {
        name: cat.name,
        sortOrder: sort - 1,
      },
    });

    const parent = await prisma.category.findUniqueOrThrow({
      where: { slug: cat.slug },
    });

    let childSort = 0;
    for (const child of cat.children) {
      const childSlug = `${cat.slug}--${child.slug}`;
      await prisma.category.upsert({
        where: { slug: childSlug },
        create: {
          id: randomUUID(),
          slug: childSlug,
          name: child.name,
          parentId: parent.id,
          sortOrder: childSort++,
        },
        update: {
          name: child.name,
          parentId: parent.id,
          sortOrder: childSort - 1,
        },
      });
    }
  }
  // eslint-disable-next-line no-console
  console.info(`[seed] Categories ready: ${CATEGORIES.length} top-level`);
}

async function seedAdmin() {
  const email = (process.env.ADMIN_SUPER_EMAIL ?? 'admin@example.com')
    .trim()
    .toLowerCase();
  const password =
    process.env.ADMIN_SUPER_PASSWORD ?? 'change-me-strong-password';

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      emailVerifiedAt: new Date(),
      passwordHash,
      status: 'ACTIVE',
      profile: {
        create: {
          displayName: 'Super Admin',
          preferredCommunity: '',
          language: 'en-NG',
          currency: 'NGN',
        },
      },
      roles: {
        create: { role: AdminRole.SUPER_ADMIN },
      },
      verifications: {
        create: {
          level: 'L2_EMAIL',
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      },
    },
    update: {
      passwordHash,
      status: 'ACTIVE',
    },
    include: { roles: true },
  });

  const hasSuper = user.roles.some((r) => r.role === AdminRole.SUPER_ADMIN);
  if (!hasSuper) {
    await prisma.userRole.create({
      data: { userId: user.id, role: AdminRole.SUPER_ADMIN },
    });
  }

  // eslint-disable-next-line no-console
  console.info(`[seed] Super Admin ready: ${email} (${user.id})`);
}

const CHAT_SCAN_RULES: { pattern: string; kind: ChatScanKind }[] = [
  { pattern: 'bank account', kind: ChatScanKind.OFF_PLATFORM_PAYMENT },
  { pattern: 'transfer directly', kind: ChatScanKind.OFF_PLATFORM_PAYMENT },
  { pattern: 'pay to my account', kind: ChatScanKind.OFF_PLATFORM_PAYMENT },
  { pattern: 'pay directly', kind: ChatScanKind.OFF_PLATFORM_PAYMENT },
  { pattern: 'https?://', kind: ChatScanKind.EXTERNAL_LINK },
  { pattern: 'whatsapp', kind: ChatScanKind.SCAM_PHRASE },
  { pattern: 'send me money first', kind: ChatScanKind.ADVANCE_PAYMENT },
];

async function seedChatScanRules() {
  for (const rule of CHAT_SCAN_RULES) {
    const existing = await prisma.chatScanRule.findFirst({
      where: { pattern: rule.pattern, kind: rule.kind },
    });
    if (existing) continue;
    await prisma.chatScanRule.create({
      data: {
        id: randomUUID(),
        pattern: rule.pattern,
        kind: rule.kind,
        enabled: true,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.info(`[seed] Chat scan rules ready: ${CHAT_SCAN_RULES.length}`);
}

/** Lagos meet points — 3–5 per community (mall / café names). */
const MEET_POINTS: {
  community: string;
  name: string;
  landmark: string;
  lat: number;
  lng: number;
}[] = [
  // Lekki Phase 1
  { community: 'Lekki Ph1', name: 'The Palms Shopping Mall', landmark: 'Near Circle Mall / Admiralty', lat: 6.4395, lng: 3.4553 },
  { community: 'Lekki Ph1', name: 'Café Neo Admiralty', landmark: 'Admiralty Way', lat: 6.4482, lng: 3.4721 },
  { community: 'Lekki Ph1', name: 'Spar Lekki', landmark: 'Lekki-Epe Expressway', lat: 6.4410, lng: 3.4680 },
  { community: 'Lekki Ph1', name: 'Jazzhole Café', landmark: 'Off Admiralty Road', lat: 6.4501, lng: 3.4695 },
  // Ikoyi
  { community: 'Ikoyi', name: 'Parkview Estate Gate', landmark: 'Parkview', lat: 6.4508, lng: 3.4352 },
  { community: 'Ikoyi', name: 'The Wheatbaker Lobby', landmark: 'Residence Road', lat: 6.4540, lng: 3.4301 },
  { community: 'Ikoyi', name: 'Ikoyi Club Car Park', landmark: 'Ikoyi Club Road', lat: 6.4565, lng: 3.4278 },
  { community: 'Ikoyi', name: 'Falomo Shopping Complex', landmark: 'Awolowo Road', lat: 6.4489, lng: 3.4210 },
  // Victoria Island
  { community: 'VI', name: 'Eko Hotel Lobby', landmark: 'Adetokunbo Ademola', lat: 6.4269, lng: 3.4305 },
  { community: 'VI', name: 'The Civic Centre', landmark: 'Ozumba Mbadiwe', lat: 6.4335, lng: 3.4240 },
  { community: 'VI', name: 'Mega Plaza VI', landmark: 'Idowu Martins', lat: 6.4288, lng: 3.4215 },
  { community: 'VI', name: 'Cafe Neo Sanusi Fafunwa', landmark: 'Sanusi Fafunwa', lat: 6.4302, lng: 3.4228 },
  { community: 'VI', name: 'Hard Rock Cafe VI', landmark: 'Landmark Beach', lat: 6.4255, lng: 3.4390 },
  // Oniru
  { community: 'Oniru', name: 'Novare Mall Oniru', landmark: 'Oniru Estate', lat: 6.4308, lng: 3.4502 },
  { community: 'Oniru', name: 'The Place Restaurant', landmark: 'Akin Adesola area', lat: 6.4295, lng: 3.4480 },
  { community: 'Oniru', name: 'Oniru Beach Gate', landmark: 'Beach Road', lat: 6.4270, lng: 3.4525 },
  { community: 'Oniru', name: 'Shoprite Oniru', landmark: 'Novare precinct', lat: 6.4312, lng: 3.4495 },
  // VGC
  { community: 'VGC', name: 'VGC Club House', landmark: 'Main Boulevard', lat: 6.4250, lng: 3.5350 },
  { community: 'VGC', name: 'Circle Mall VGC', landmark: 'Near Chevron Drive extension', lat: 6.4280, lng: 3.5280 },
  { community: 'VGC', name: 'Domino\'s VGC', landmark: 'Shopping strip', lat: 6.4265, lng: 3.5310 },
  { community: 'VGC', name: 'VGC Gate 1 Meeting Point', landmark: 'Main Gate', lat: 6.4235, lng: 3.5220 },
  // Chevron
  { community: 'Chevron', name: 'Chevron Toll Gate Area', landmark: 'Chevron Drive', lat: 6.4480, lng: 3.4900 },
  { community: 'Chevron', name: 'Shoprite Chevron', landmark: 'Chevron Drive', lat: 6.4510, lng: 3.4950 },
  { community: 'Chevron', name: 'Café One Chevron', landmark: 'Nearby plazas', lat: 6.4495, lng: 3.4925 },
  { community: 'Chevron', name: 'Lekki Gardens Gate', landmark: 'Off Chevron', lat: 6.4530, lng: 3.4980 },
  // Ajah
  { community: 'Ajah', name: 'Shoprite Sangotedo', landmark: 'Abraham Adesanya', lat: 6.4680, lng: 3.5800 },
  { community: 'Ajah', name: 'Ajah Bus Stop Plaza', landmark: 'Addo Road junction', lat: 6.4660, lng: 3.5650 },
  { community: 'Ajah', name: 'The Palms Ajah / Novare', landmark: 'Sangotedo', lat: 6.4700, lng: 3.5750 },
  { community: 'Ajah', name: 'Debonairs Ajah', landmark: 'Addo Road', lat: 6.4675, lng: 3.5700 },
  { community: 'Ajah', name: 'Market Square Ajah', landmark: 'Near Thomas Estate', lat: 6.4655, lng: 3.5725 },
];

async function seedMeetPoints() {
  for (const mp of MEET_POINTS) {
    const existing = await prisma.meetPoint.findFirst({
      where: { community: mp.community, name: mp.name },
    });
    if (existing) {
      await prisma.meetPoint.update({
        where: { id: existing.id },
        data: {
          landmark: mp.landmark,
          lat: mp.lat,
          lng: mp.lng,
          active: true,
        },
      });
      continue;
    }
    await prisma.meetPoint.create({
      data: {
        id: randomUUID(),
        community: mp.community,
        name: mp.name,
        landmark: mp.landmark,
        lat: mp.lat,
        lng: mp.lng,
        active: true,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.info(`[seed] Meet points ready: ${MEET_POINTS.length}`);
}

async function seedCommunities() {
  for (const c of PHASE22_COMMUNITY_SEEDS) {
    await prisma.community.upsert({
      where: { slug: c.slug },
      create: {
        id: randomUUID(),
        slug: c.slug,
        name: c.name,
        type: c.type,
        privacy: c.privacy,
        about: c.about,
        geoLat: c.geoLat,
        geoLng: c.geoLng,
        verified: c.verified ?? false,
        active: true,
      },
      update: {
        name: c.name,
        type: c.type,
        privacy: c.privacy,
        about: c.about,
        geoLat: c.geoLat,
        geoLng: c.geoLng,
        verified: c.verified ?? false,
        active: true,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.info(
    `[seed] Communities ready: ${PHASE22_COMMUNITY_SEEDS.length} PRD examples`,
  );
}

async function main() {
  await seedAdmin();
  await seedCategories();
  await seedChatScanRules();
  await seedMeetPoints();
  await seedCommunities();
  await seedRiskAndModeration(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
