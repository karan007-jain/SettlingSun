const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all data...');
  
  // Delete in correct order (child tables first)
  await prisma.idMaster.deleteMany({});
  console.log('✓ Cleared IdMaster');
  
  await prisma.exch.deleteMany({});
  console.log('✓ Cleared Exch');
  
  await prisma.partyMaster.deleteMany({});
  console.log('✓ Cleared PartyMaster');
  
  console.log('\nAll data cleared. Run: npx prisma db push --accept-data-loss');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
