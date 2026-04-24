import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getUserFriendlyErrorMessage } from "@/lib/api-error";

const uploadFieldsSchema = z.object({
  settleId: z.string().min(1, "settleId is required"),
  exch: z.string().min(1, "exch is required"),
  upline: z.string().min(1, "upline is required"),
});

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

    const fieldValidation = uploadFieldsSchema.safeParse({ settleId, exch, upline });
    if (!file || !fieldValidation.success) {
      return NextResponse.json(
        {
          error: "Missing or invalid required fields",
          details: fieldValidation.success ? undefined : fieldValidation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const fields = fieldValidation.data;

    // Validate settlement exists
    const settlement = await prisma.settlement.findUnique({
      where: { settleId: fields.settleId },
    });
    if (!settlement) {
      return NextResponse.json(
        { error: `Settlement ${fields.settleId} not found` },
        { status: 404 }
      );
    }

    // Read file bytes into memory — no filesystem writes (serverless-safe)
    const arrayBuffer = await file.arrayBuffer();
    const fileData = Buffer.from(arrayBuffer);

    const upload = await prisma.settlementUpload.create({
      data: {
        settlementId: settlement.id,
        settleId: fields.settleId,
        exch: fields.exch,
        upline: fields.upline,
        filename: file.name,
        fileData,
        status: "uploaded",
      },
    });

    return NextResponse.json({ uploadId: upload.id, filename: file.name });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: getUserFriendlyErrorMessage(err) },
      { status: 500 }
    );
  }
}
