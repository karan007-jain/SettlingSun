import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import formatConfigData from "./format_config.json";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: cd 
      email: "admin@example.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Created admin user:", admin.email);

  // Create sample PartyMaster records
  const party1 = await prisma.partyMaster.upsert({
    where: { partyCode: "PTY001" },
    update: {},
    create: {
      partyCode: "PTY001",
      partyName: "Party One",
      ref: "REF001",
    },
  });

  const party2 = await prisma.partyMaster.upsert({
    where: { partyCode: "PTY002" },
    update: {},
    create: {
      partyCode: "PTY002",
      partyName: "Party Two",
      ref: "REF002",
    },
  });

  console.log("✅ Created sample parties");

  // Create sample Exch record
  const exch1 = await prisma.exch.upsert({
    where: { id: "exch-001" },
    update: {},
    create: {
      id: "exch-001",
      idName: "Exchange One",
      partyCode: "PTY001",
      shortCode: "EXCH001",
      rate: 100.50,
      idComm: 2.5,
      idAc: "PTY002",
    },
  });

  console.log("✅ Created sample exchange");

  // Seed FormatConfig from format_config.json
  console.log(`🔧 Seeding ${formatConfigData.length} FormatConfig entries...`);
  let fcCount = 0;
  for (const entry of formatConfigData as Array<{ filecode: string; formatter: string }>) {
    await prisma.formatConfig.upsert({
      where: { filecode: entry.filecode },
      create: { filecode: entry.filecode, formatter: entry.formatter },
      update: { formatter: entry.formatter },
    });
    fcCount++;
  }
  console.log(`✅ Seeded ${fcCount} FormatConfig entries`);

  console.log("🎉 Seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
