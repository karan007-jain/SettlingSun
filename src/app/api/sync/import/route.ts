import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFriendlyErrorMessage } from "@/lib/api-error";

// Sync strategies
const SyncStrategy = z.enum(["UPSERT", "REPLACE", "INSERT_ONLY"]);

// Import schemas
const partySchema = z.object({
  partyCode: z.string().min(1).max(6).toUpperCase(),
  partyName: z.string().max(30),
  ref: z.string().max(20).optional().nullable(),
});

const exchSchema = z.object({
  idName: z.string().max(20),
  shortCode: z.string().max(8),
  partyCode: z.string().min(1).max(6).toUpperCase(),
  idAc: z.string().min(1).max(10).toUpperCase(),
  rate: z.number(),
  idComm: z.number(),
});

const idMasterSchema = z.object({
  userId: z.string().max(15),
  partyCode: z.string().min(1).max(6).toUpperCase(),
  idCode: z.string().max(20),
  credit: z.number(),
  comm: z.number(),
  rate: z.number(),
  pati: z.number().optional().nullable(),
  partner: z.string().min(1).max(6).toUpperCase().optional().nullable(),
  active: z.boolean().default(true),
  isUpline: z.boolean().default(false),
  uplineId: z.string().max(15).optional().nullable(),
});

const importRequestSchema = z.object({
  entity: z.enum(["party", "exch", "idmaster"]),
  data: z.array(z.unknown()),
  strategy: SyncStrategy.optional().default("UPSERT"),
  matchBy: z.string().optional(),
});

function getRecordField(record: unknown, field: string): string {
  if (record && typeof record === "object" && field in record) {
    const value = (record as Record<string, unknown>)[field];
    return value == null ? "unknown" : String(value);
  }
  return "unknown";
}

function checkApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-sync-api-key");
  const expectedKey = process.env.SYNC_API_KEY;
  
  if (!expectedKey) {
    console.error("SYNC_API_KEY not configured");
    return false;
  }
  
  return apiKey === expectedKey;
}

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!checkApiKey(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = importRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { entity, data, strategy: validStrategy, matchBy } = parsed.data;

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Handle different entities
    if (entity === "party") {
      if (validStrategy === "REPLACE") {
        await prisma.partyMaster.deleteMany({});
      }

      for (const record of data) {
        try {
          const validated = partySchema.parse(record);
          
          if (validStrategy === "INSERT_ONLY") {
            const existing = await prisma.partyMaster.findUnique({
              where: { partyCode: validated.partyCode },
            });
            
            if (!existing) {
              await prisma.partyMaster.create({ data: validated });
              created++;
            }
          } else {
            // UPSERT
            const existing = await prisma.partyMaster.findUnique({
              where: { partyCode: validated.partyCode },
            });
            
            await prisma.partyMaster.upsert({
              where: { partyCode: validated.partyCode },
              create: validated,
              update: {
                partyName: validated.partyName,
                ref: validated.ref,
              },
            });
            
            if (existing) {
              updated++;
            } else {
              created++;
            }
          }
        } catch (error: any) {
          failed++;
          errors.push(`Party ${getRecordField(record, "partyCode")}: ${getUserFriendlyErrorMessage(error)}`);
        }
      }
    } else if (entity === "exch") {
      if (validStrategy === "REPLACE") {
        await prisma.exch.deleteMany({});
      }

      for (const record of data) {
        try {
          const validated = exchSchema.parse(record);
          
          if (validStrategy === "INSERT_ONLY") {
            const existing = matchBy === "SHORT_CODE"
              ? await prisma.exch.findUnique({ where: { shortCode: validated.shortCode } })
              : await prisma.exch.findUnique({ where: { idName: validated.idName } });
            
            if (!existing) {
              await prisma.exch.create({ data: validated });
              created++;
            }
          } else {
            // UPSERT
            const existing = matchBy === "SHORT_CODE"
              ? await prisma.exch.findUnique({ where: { shortCode: validated.shortCode } })
              : await prisma.exch.findUnique({ where: { idName: validated.idName } });
            
            if (existing) {
              await prisma.exch.update({
                where: { id: existing.id },
                data: validated,
              });
              updated++;
            } else {
              await prisma.exch.create({ data: validated });
              created++;
            }
          }
        } catch (error: any) {
          failed++;
          errors.push(`Exch ${getRecordField(record, "idName")}: ${getUserFriendlyErrorMessage(error)}`);
        }
      }
    } else if (entity === "idmaster") {
      if (validStrategy === "REPLACE") {
        await prisma.idMaster.deleteMany({});
      }

      for (const record of data) {
        try {
          const validated = idMasterSchema.parse(record);
          
          if (validStrategy === "INSERT_ONLY") {
            const existing = await prisma.idMaster.findUnique({
              where: { userId: validated.userId },
            });
            
            if (!existing) {
              await prisma.idMaster.create({ data: validated });
              created++;
            }
          } else {
            // UPSERT
            const existing = await prisma.idMaster.findUnique({
              where: { userId: validated.userId },
            });
            
            await prisma.idMaster.upsert({
              where: { userId: validated.userId },
              create: validated,
              update: {
                partyCode: validated.partyCode,
                idCode: validated.idCode,
                credit: validated.credit,
                comm: validated.comm,
                rate: validated.rate,
                pati: validated.pati,
                partner: validated.partner,
                active: validated.active,
                isUpline: validated.isUpline,
                uplineId: validated.uplineId,
              },
            });
            
            if (existing) {
              updated++;
            } else {
              created++;
            }
          }
        } catch (error: any) {
          failed++;
          errors.push(`IdMaster ${getRecordField(record, "userId")}: ${getUserFriendlyErrorMessage(error)}`);
        }
      }
    } else {
      return NextResponse.json(
        { error: `Unknown entity: ${entity}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      created,
      updated,
      failed,
      errors,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: getUserFriendlyErrorMessage(error) },
      { status: 500 }
    );
  }
}
