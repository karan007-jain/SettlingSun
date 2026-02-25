import path from "path";
import fs from "fs";
import type { DbfRecord } from "./calculator";

// dbffile uses ESM exports — we import the named exports
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DBFFile } = require("dbffile") as typeof import("dbffile");

// Field definitions matching the exact SETL*.DBF structure
const SETL_FIELDS = [
  { name: "WEEK",      type: "N" as const, size: 2,  decimalPlaces: 0 },
  { name: "SODATYPE",  type: "C" as const, size: 1 },
  { name: "PCODE",     type: "C" as const, size: 6 },
  { name: "DATE",      type: "D" as const, size: 8 },
  { name: "USERID",    type: "C" as const, size: 10 },
  { name: "IDNAME",    type: "C" as const, size: 20 },
  { name: "IDSHORT",   type: "C" as const, size: 5 },
  { name: "IDPCODE",   type: "C" as const, size: 6 },
  { name: "IDRATE",    type: "N" as const, size: 8,  decimalPlaces: 2 },
  { name: "IDCOMM",    type: "N" as const, size: 6,  decimalPlaces: 2 },
  { name: "COMMISSION",type: "N" as const, size: 6,  decimalPlaces: 2 },
  { name: "RATE",      type: "N" as const, size: 8,  decimalPlaces: 2 },
  { name: "PATI",      type: "N" as const, size: 6,  decimalPlaces: 2 },
  { name: "PARTNER",   type: "C" as const, size: 6 },
  { name: "POINT",     type: "N" as const, size: 8,  decimalPlaces: 2 },
  { name: "AMT_GROSS", type: "N" as const, size: 12, decimalPlaces: 2 },
  { name: "AMT_COMM",  type: "N" as const, size: 12, decimalPlaces: 2 },
  { name: "AMT_PATI",  type: "N" as const, size: 12, decimalPlaces: 2 },
  { name: "AMOUNT",    type: "N" as const, size: 12, decimalPlaces: 2 },
  { name: "ADRCR",     type: "C" as const, size: 1 },
  { name: "TIME",      type: "C" as const, size: 5 },
  { name: "TALLY",     type: "L" as const, size: 1 },
  { name: "DIFFAMT",   type: "N" as const, size: 10, decimalPlaces: 2 },
];

function getDbfPath(settleId: string): string {
  // Extract numeric part, e.g. "SETL78" -> "78"
  const num = settleId.replace(/^SETL/i, "");
  const dir = path.join(process.cwd(), "data", "settlements", settleId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `SETL${num}.DBF`);
}

/**
 * Check whether the target DBF already has records with TIME = upline.
 * Returns the count of matching records.
 */
export async function checkExistingUplineRecords(
  settleId: string,
  upline: string
): Promise<number> {
  const filePath = getDbfPath(settleId);
  if (!fs.existsSync(filePath)) return 0;

  try {
    const dbf = await DBFFile.open(filePath);
    const records = await dbf.readRecords();
    return records.filter(
      (r: Record<string, unknown>) =>
        String(r["TIME"] ?? "").trim().toLowerCase() === upline.toLowerCase()
    ).length;
  } catch {
    return 0;
  }
}

/**
 * Append an array of DbfRecord objects to the settlement DBF file.
 * Creates the file if it doesn't exist.
 */
export async function appendToSettlementDbf(
  settleId: string,
  records: DbfRecord[]
): Promise<{ filePath: string; count: number }> {
  const filePath = getDbfPath(settleId);

  let dbf: InstanceType<typeof DBFFile>;

  if (fs.existsSync(filePath)) {
    dbf = await DBFFile.open(filePath);
  } else {
    dbf = await DBFFile.create(filePath, SETL_FIELDS);
  }

  const rows = records.map((rec) => ({
    WEEK:       rec.WEEK,
    SODATYPE:   rec.SODATYPE.padEnd(1),
    PCODE:      rec.PCODE.padEnd(6),
    DATE:       rec.DATE,
    USERID:     rec.USERID.padEnd(10).slice(0, 10),
    IDNAME:     rec.IDNAME.padEnd(20).slice(0, 20),
    IDSHORT:    rec.IDSHORT.padEnd(5).slice(0, 5),
    IDPCODE:    rec.IDPCODE.padEnd(6).slice(0, 6),
    IDRATE:     rec.IDRATE,
    IDCOMM:     rec.IDCOMM,
    COMMISSION: rec.COMMISSION,
    RATE:       rec.RATE,
    PATI:       rec.PATI,
    PARTNER:    rec.PARTNER.padEnd(6).slice(0, 6),
    POINT:      rec.POINT,
    AMT_GROSS:  rec.AMT_GROSS,
    AMT_COMM:   rec.AMT_COMM,
    AMT_PATI:   rec.AMT_PATI,
    AMOUNT:     rec.AMOUNT,
    ADRCR:      rec.ADRCR.padEnd(1).slice(0, 1),
    TIME:       rec.TIME.padEnd(5).slice(0, 5),
    TALLY:      rec.TALLY,
    DIFFAMT:    rec.DIFFAMT,
  }));

  await dbf.appendRecords(rows);

  return { filePath, count: rows.length };
}

/**
 * Read all records from a settlement DBF for display.
 */
export async function readSettlementDbf(
  settleId: string
): Promise<Record<string, unknown>[]> {
  const filePath = getDbfPath(settleId);
  if (!fs.existsSync(filePath)) return [];
  try {
    const dbf = await DBFFile.open(filePath);
    return await dbf.readRecords() as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export function getSettlementDbfPath(settleId: string): string {
  return getDbfPath(settleId);
}
