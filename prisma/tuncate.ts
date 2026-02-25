import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

async function main() {
  console.log("Truncating IdMaster table...");
  await prisma.idMaster.deleteMany({});
  console.log("✅ Truncated IdMaster table");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error truncating database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
