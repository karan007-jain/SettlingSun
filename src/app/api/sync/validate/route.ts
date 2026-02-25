import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Validation schemas
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
    const { entity, data } = body;

    if (!entity || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Invalid request. Expected { entity, data: [] }" },
        { status: 400 }
      );
    }

    if (!["party", "exch", "idmaster"].includes(entity)) {
      return NextResponse.json(
        { error: `Unknown entity: ${entity}` },
        { status: 400 }
      );
    }

    const valid: any[] = [];
    const invalid: any[] = [];

    // Validate each record
    for (const record of data) {
      try {
        if (entity === "party") {
          const validated = partySchema.parse(record);
          valid.push(validated);

        } else if (entity === "exch") {
          const validated = exchSchema.parse(record);

          const [partyExists, idAcExists] = await Promise.all([
            prisma.partyMaster.findUnique({ where: { partyCode: validated.partyCode } }),
            prisma.partyMaster.findUnique({ where: { partyCode: validated.idAc } }),
          ]);

          if (!partyExists) {
            invalid.push({ record, errors: [`Party code '${validated.partyCode}' does not exist`] });
            continue;
          }
          if (!idAcExists) {
            invalid.push({ record, errors: [`ID AC '${validated.idAc}' does not exist`] });
            continue;
          }
          valid.push(validated);

        } else if (entity === "idmaster") {
          const validated = idMasterSchema.parse(record);

          const [partyExists, idCodeExists, partnerExists, uplineExists] = await Promise.all([
            prisma.partyMaster.findUnique({ where: { partyCode: validated.partyCode } }),
            prisma.exch.findUnique({ where: { idName: validated.idCode } }),
            validated.partner
              ? prisma.partyMaster.findUnique({ where: { partyCode: validated.partner } })
              : Promise.resolve(null),
            validated.uplineId
              ? prisma.idMaster.findUnique({ where: { userId: validated.uplineId, isUpline: true } })
              : Promise.resolve(null),
          ]);
          
          if(validated.uplineId == "AL5050") console.log("Validated ID Master Record:",validated,  uplineExists);
          const errors: string[] = [];
          if (!partyExists) errors.push(`Party code '${validated.partyCode}' does not exist`);
          if (!idCodeExists) errors.push(`ID code '${validated.idCode}' does not exist in Exch`);
          if (validated.partner && !partnerExists) errors.push(`Partner '${validated.partner}' does not exist`);
          if (validated.uplineId && !uplineExists) {
            const uplineInBatch = data.find((r: any) => {
              try {
                return idMasterSchema.parse(r).userId === validated.uplineId;
              } catch {
                return false;
              }
            });
            if (!uplineInBatch) {
              errors.push(`Upline '${validated.uplineId}' does not exist in database or current batch`);
            }
          }

          if (errors.length > 0) {
            invalid.push({ record, errors });
            continue;
          }
          valid.push(validated);
        }
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          invalid.push({
            record,
            errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          });
        } else {
          invalid.push({
            record,
            errors: [error.message || "Unknown error"],
          });
        }
      }
    }

    return NextResponse.json({
      valid,
      invalid,
    });
  } catch (error: any) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
