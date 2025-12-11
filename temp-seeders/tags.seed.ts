import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedTags() {
  console.log('Seeding Tags (No hashtags - only @mentions)...');

  // No hashtags needed - we only use @mentions
  const tags: any[] = [];

  for (const tag of tags) {
    await prisma.tag.create({
      data: tag,
    });
  }

  console.log('Tags seeded successfully!');
}
