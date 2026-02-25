const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearIdMaster() {
  try {
    console.log('Deleting all IdMaster records...');
    
    const result = await prisma.idMaster.deleteMany({});
    
    console.log(`✓ Deleted ${result.count} IdMaster records`);
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearIdMaster();
