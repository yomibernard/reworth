/**
 * ReWorth Prisma seed — Super Admin + categories (PRD §26).
 *
 * Env:
 *   ADMIN_SUPER_EMAIL
 *   ADMIN_SUPER_PASSWORD
 */
import { PrismaClient, AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

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

async function main() {
  await seedAdmin();
  await seedCategories();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
