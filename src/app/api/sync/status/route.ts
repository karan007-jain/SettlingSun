import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function checkApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-sync-api-key");
  const expectedKey = process.env.SYNC_API_KEY;
  
  if (!expectedKey) {
    console.error("SYNC_API_KEY not configured");
    return false;
  }
  
  return apiKey === expectedKey;
}

export async function GET(request: NextRequest) {
  try {
    // Check API key
    if (!checkApiKey(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [partyCount, exchCount, idMasterCount] = await Promise.all([
      prisma.partyMaster.count(),
      prisma.exch.count(),
      prisma.idMaster.count(),
    ]);

    return NextResponse.json({
      partyMaster: partyCount,
      exch: exchCount,
      idMaster: idMasterCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Status error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
