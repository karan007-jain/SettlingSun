import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserFriendlyErrorMessage } from "@/lib/api-error";
import path from "path";
import fs from "fs";
import os from "os";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DBFFile } = require("dbffile") as typeof import("dbffile");

const SETL_FIELDS = [
  { name: "WEEK",       type: "N" as const, size: 2,  decimalPlaces: 0 },
  { name: "SODATYPE",   type: "C" as const, size: 1 },
  { name: "PCODE",      type: "C" as const, size: 6 },
  { name: "DATE",       type: "D" as const, size: 8 },
  { name: "USERID",     type: "C" as const, size: 10 },
  { name: "IDNAME",     type: "C" as const, size: 20 },
  { name: "IDSHORT",    type: "C" as const, size: 5 },
  { name: "IDPCODE",    type: "C" as const, size: 6 },
  { name: "IDRATE",     type: "N" as const, size: 8,  decimalPlaces: 2 },
  { name: "IDCOMM",     type: "N" as const, size: 6,  decimalPlaces: 2 },
  { name: "COMMISSION", type: "N" as const, size: 6,  decimalPlaces: 2 },
  { name: "RATE",       type: "N" as const, size: 8,  decimalPlaces: 2 },
  { name: "PATI",       type: "N" as const, size: 6,  decimalPlaces: 2 },
  { name: "PARTNER",    type: "C" as const, size: 6 },
  { name: "POINT",      type: "N" as const, size: 8,  decimalPlaces: 2 },
  { name: "AMT_GROSS",  type: "N" as const, size: 12, decimalPlaces: 2 },
  { name: "AMT_COMM",   type: "N" as const, size: 12, decimalPlaces: 2 },
  { name: "AMT_PATI",   type: "N" as const, size: 12, decimalPlaces: 2 },
  { name: "AMOUNT",     type: "N" as const, size: 12, decimalPlaces: 2 },
  { name: "ADRCR",      type: "C" as const, size: 1 },
  { name: "TIME",       type: "C" as const, size: 5 },
  { name: "TALLY",      type: "L" as const, size: 1 },
  { name: "DIFFAMT",    type: "N" as const, size: 10, decimalPlaces: 2 },
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ settleId: string }> }
) {
  let tmpDir: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { settleId } = await params;

    // Load all settlement records from DB
    const rows = await prisma.settlementRecord.findMany({
      where: { settleId },
      orderBy: { createdAt: "asc" },
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No records found for this settlement" },
        { status: 404 }
      );
    }

    // Write to a temp DBF file
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "setl-"));
    const tmpFile = path.join(tmpDir, `${settleId}.DBF`);

    const dbf = await DBFFile.create(tmpFile, SETL_FIELDS);

    const records = rows.map((r) => ({
      WEEK:       r.week,
      SODATYPE:   r.sodaType.padEnd(1),
      PCODE:      r.pcode.padEnd(6),
      DATE:       r.date,
      USERID:     r.userId.padEnd(10).slice(0, 10),
      IDNAME:     r.idName.padEnd(20).slice(0, 20),
      IDSHORT:    r.idShort.padEnd(5).slice(0, 5),
      IDPCODE:    r.idPcode.padEnd(6).slice(0, 6),
      IDRATE:     Number(r.idRate),
      IDCOMM:     Number(r.idComm),
      COMMISSION: Number(r.commission),
      RATE:       Number(r.rate),
      PATI:       Number(r.pati),
      PARTNER:    r.partner.padEnd(6).slice(0, 6),
      POINT:      Number(r.point),
      AMT_GROSS:  Number(r.amtGross),
      AMT_COMM:   Number(r.amtComm),
      AMT_PATI:   Number(r.amtPati),
      AMOUNT:     Number(r.amount),
      ADRCR:      r.adrCr.padEnd(1).slice(0, 1),
      TIME:       r.upline.padEnd(5).slice(0, 5),
      TALLY:      r.tally,
      DIFFAMT:    Number(r.diffAmt),
    }));

    await dbf.appendRecords(records);

    // Read the temp file and stream it back
    const fileBuffer = fs.readFileSync(tmpFile);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${settleId}.DBF"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: getUserFriendlyErrorMessage(error) }, { status: 500 });
  } finally {
    // Clean up temp files
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
