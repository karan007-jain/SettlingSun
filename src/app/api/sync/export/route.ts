import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFriendlyErrorMessage } from "@/lib/api-error";

const exportRequestSchema = z.object({
  entity: z.enum(["party", "exch", "idmaster"]),
  modifiedSince: z.string().optional(),
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
    const parsed = exportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { entity, modifiedSince } = parsed.data;

    const sinceDate = modifiedSince ? new Date(modifiedSince) : null;
    const whereClause = sinceDate ? { updatedAt: { gte: sinceDate } } : {};

    let data;
    
    if (entity === "party") {
      const records = await prisma.partyMaster.findMany({
        where: whereClause,
        orderBy: { partyCode: 'asc' },
      });
      // Transform to DBF format
      data = records.map(r => ({
        PARTY_CODE: r.partyCode,
        PARTY_NAME: r.partyName,
        REF: r.ref || '',
      }));
    } else if (entity === "exch") {
      const records = await prisma.exch.findMany({
        where: whereClause,
        orderBy: { idName: 'asc' },
      });
      // Transform to DBF format
      data = records.map(r => ({
        ID_NAME: r.idName,
        PARTY_CODE: r.partyCode,
        SHORT_CODE: r.shortCode,
        RATE: Number(r.rate),
        ID_COMM: Number(r.idComm),
        ID_AC: r.idAc,
      }));
    } else if (entity === "idmaster") {
      const records = await prisma.idMaster.findMany({
        where: whereClause,
        orderBy: { userId: 'asc' },
      });
      // Transform to DBF format
      data = records.map(r => ({
        USERID:     r.userId,
        PCODE:      r.partyCode,
        IDNAME:     r.idCode,
        CREDIT:     Math.round(Number(r.credit)),
        COMMISSION: Number(r.comm),
        RATE:       Number(r.rate),
        PATI:       r.pati ? Number(r.pati) : 0,
        PARTNER:    r.partner || '',
        ACTIVE:     r.active ? 'T' : 'F',
        UPLINE:     r.uplineId || '',
        ISUPLINE:   r.isUpline,
      }));
    } else {
      return NextResponse.json(
        { error: `Unknown entity: ${entity}` },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: getUserFriendlyErrorMessage(error) },
      { status: 500 }
    );
  }
}
