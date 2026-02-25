import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const settleId = formData.get("settleId") as string | null;
    const exch = formData.get("exch") as string | null;
    const upline = formData.get("upline") as string | null;

    if (!file || !settleId || !exch || !upline) {
      return NextResponse.json(
        { error: "Missing required fields: file, settleId, exch, upline" },
        { status: 400 }
      );
    }

    // Validate settlement exists
    const settlement = await prisma.settlement.findUnique({
      where: { settleId },
    });
    if (!settlement) {
      return NextResponse.json(
        { error: `Settlement ${settleId} not found` },
        { status: 404 }
      );
    }

    // Read file bytes into memory — no filesystem writes (serverless-safe)
    const arrayBuffer = await file.arrayBuffer();
    const fileData = Buffer.from(arrayBuffer);

    const upload = await prisma.settlementUpload.create({
      data: {
        settlementId: settlement.id,
        settleId,
        exch,
        upline,
        filename: file.name,
        fileData,
        status: "uploaded",
      },
    });

    return NextResponse.json({ uploadId: upload.id, filename: file.name });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed: " + String(err) },
      { status: 500 }
    );
  }
}
