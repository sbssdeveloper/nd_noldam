import { PrismaClient } from '@prisma/client';
import { seedHomePageSettings } from './home-page-settings.seed';
import { seedTypeSettings } from './type-settings.seed';

const prisma = new PrismaClient();

async function updateSettingsOnly() {
  console.log('🔄 Updating HomePageSettings and TypeSettings only...\n');

  try {
    console.log('1. Updating HomePageSettings...');
    await seedHomePageSettings();
    
    console.log('\n2. Updating TypeSettings...');
    await seedTypeSettings();

    console.log('\n✅ Settings update completed successfully!');
    console.log('📝 Note: Only HomePageSettings and TypeSettings were updated.');
    console.log('🔒 All other table data remains unchanged.');
  } catch (error) {
    console.error('❌ Error during settings update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateSettingsOnly()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
