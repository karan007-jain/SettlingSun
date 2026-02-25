import { parse, isValid } from "date-fns";

export interface FormatterOutput {
  date: Date;
  userid: string;
  point: number;
  upline: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return NaN;
  const s = String(v).replace(/,/g, "").trim();
  return parseFloat(s);
}

function absNum(v: unknown): number {
  const n = toNum(v);
  return isNaN(n) ? NaN : Math.abs(n);
}

function tryParse(raw: string, fmt: string): Date | null {
  try {
    const d = parse(raw.trim(), fmt, new Date(2000, 0, 1));
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function parseDate(raw: unknown, ...formats: string[]): Date {
  const s = String(raw ?? "").trim();
  for (const fmt of formats) {
    const d = tryParse(s, fmt);
    if (d) return d;
  }
  // fallback: try native Date parse
  const fb = new Date(s);
  if (isValid(fb)) return fb;
  return new Date(); // last resort
}

// ── formatters ────────────────────────────────────────────────────────────────

export function formattype1(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const credit = absNum(row["Credit"]);
  const debit = absNum(row["Debit"]);
  const detail = String(row["Detail"] ?? "");
  const detailLower = detail.toLowerCase();
  if (detailLower.includes("closing") || detailLower.includes("opening")) {
    return null;
  }
  const time = String(row["Time"] ?? "");
  const userid = detail
    .replace(/Debit from/gi, "")
    .replace(/Credit to/gi, "")
    .trim()
    .toUpperCase();
  const amtgross = !isNaN(credit) && credit !== 0 ? credit : debit;
  const date = parseDate(time, "dd/MM/yyyy, HH:mm:ss", "dd/MM/yyyy HH:mm:ss", "M/d/yyyy HH:mm:ss");
  return { date, userid, point: amtgross, upline };
}

export function formattype2(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const credit = absNum(row["Credit"]);
  const debit = absNum(row["Debit"]);
  const description = String(row["Description"] ?? row["Remark"] ?? "");
  const descLower = description.toLowerCase();
  if (descLower.includes("opening") || descLower.includes("closing")) {
    return null;
  }
  const date = parseDate(
    String(row["Date"] ?? ""),
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy, HH:mm:ss",
    "M/d/yyyy HH:mm:ss",
    "yyyy-MM-dd HH:mm:ss"
  );
  const fromto = String(row["FromTo"] ?? "");
  const ft = fromto.split(" ");
  const point = !isNaN(debit) && debit > 0 ? debit : credit;
  const userid = (
    !isNaN(debit) && debit > 0 ? ft[1] ?? "" : ft[0] ?? ""
  ).toUpperCase();
  return { date, userid, point, upline };
}

export function formattype3(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const credit = toNum(row["withdraw"]);
  const debit = toNum(row["Deposit"]);
  const date = parseDate(
    String(row["DateTime"] ?? ""),
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy, HH:mm:ss",
    "M/d/yyyy HH:mm:ss"
  );
  const userid = String(row["To"] ?? "").toUpperCase();
  const point = !isNaN(debit) && debit > 0 ? debit : credit;
  return { date, userid, point, upline };
}

export function formattype4(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  let point = toNum(row["amount"]);
  const date = parseDate(
    String(row["createdAt"] ?? ""),
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    "yyyy-MM-dd HH:mm:ss"
  );
  let userid = point < 0
    ? String(row["fromUserName"] ?? "")
    : String(row["toUserName"] ?? "");
  if (userid.toUpperCase() === upline.toUpperCase()) {
    point = -point;
    userid = upline;
  }
  return { date, userid: userid.toUpperCase(), point, upline };
}

export function formattype5(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const credit = toNum(row["Credit"]);
  const debit = toNum(row["Debit"]);
  if (isNaN(credit) && isNaN(debit)) return null;
  const desc = row["Description"];
  if (typeof desc !== "string") return null;

  // description contains the actual amount string
  const rawAmt = desc.replace(/,/g, "").trim();
  const parsedAmt = parseFloat(rawAmt);
  const point = !isNaN(credit) && !isNaN(credit) && credit !== 0
    ? -Math.abs(isNaN(parsedAmt) ? credit : parsedAmt)
    : isNaN(parsedAmt) ? debit : parsedAmt;

  const date = parseDate(
    String(row["Date Time"] ?? ""),
    "dd/MM/yyyy, hh:mm:ss a",
    "dd/MM/yyyy, HH:mm:ss",
    "dd/MM/yyyy HH:mm:ss"
  );
  const fromto = String(row["From To"] ?? "");
  const ft = fromto.split(" ");
  const userid = (
    !isNaN(credit) && credit !== 0 ? ft[0] ?? "" : ft[1] ?? ""
  ).toUpperCase();
  return { date, userid, point, upline };
}

export function formattype6(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const remark = String(row["Remark"] ?? "").toLowerCase();
  if (remark.includes("opening") || remark.includes("closing")) return null;

  const credit = absNum(row["Credit"]);
  const debit = absNum(row["Debit"]);
  if (isNaN(credit) && isNaN(debit)) return null;

  const date = parseDate(
    String(row["Date"] ?? ""),
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy, HH:mm:ss",
    "dd-MMM-yyyy HH:mm:ss",
    "dd-MMM-yyyy, HH:mm:ss"
  );

  // Support both "Fromto" (new) and "FromTo" (legacy) column names
  const fromto = String(row["Fromto"] ?? row["FromTo"] ?? "");
  const isSlash = fromto.includes("/");
  const ft = fromto.split(isSlash ? "/" : "-");

  const point = !isNaN(debit) && debit > 0 ? debit : credit;
  let userid: string;
  if (isSlash) {
    // New format: "userid/exchange" — userid is always the first part
    userid = (debit > 0 ? (ft[1] ?? "") : (ft[0] ?? "")).trim().toUpperCase();
  } else {
    // Legacy format: split by "-"
    userid = (
      !isNaN(debit) && debit > 0
        ? (ft[1] ?? "").split(" ")[0]
        : (ft[0] ?? "").split(" ")[0]
    ).toUpperCase();
  }

  if (!userid) return null;
  return { date, userid, point, upline };
}

export function formattype7(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const credit = absNum(row["Credit"]);
  const debit = absNum(row["Debit"]);
  const date = parseDate(
    String(row["Settled Date"] ?? ""),
    "M/d/yyyy HH:mm:ss",
    "M/d/yyyy, HH:mm:ss",
    "dd/MM/yyyy HH:mm:ss"
  );
  const trans = toNum(row["Transit ID"]);
  if (isNaN(trans) || trans === 0) return null;
  const desc = String(row["Description"] ?? "");
  const parts = desc.split(",");
  const type = parts[1]?.trim();
  if (type !== "D" && type !== "W") return null;
  const userid = (parts[0] ?? "").trim().toUpperCase();
  const point = !isNaN(debit) && debit > 0 ? debit : credit;
  return { date, userid, point, upline };
}

export function formattype8(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const credit = absNum(row["CR"]);
  const debit = absNum(row["DR"]);
  const date = parseDate(
    String(row["Date"] ?? ""),
    "dd/MM/yyyy",
    "dd/MM/yyyy HH:mm:ss",
    "M/d/yyyy"
  );
  const userid = String(row["To"] ?? "").toUpperCase();
  const point = !isNaN(debit) && debit > 0 ? debit : credit;
  return { date, userid, point, upline };
}

export function formattype9(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const credit = absNum(row["creditAmount"]);
  const debit = absNum(row["debitAmount"]);
  const date = parseDate(
    String(row["createdAt"] ?? ""),
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd HH:mm:ss"
  );
  const desc = String(row["description"] ?? "");
  const parts = desc.trim().split(/\s+/);
  const t = parts[0];
  if (t !== "D" && t !== "W") return null;
  // userid is the second space-delimited word
  const userid = (parts[1] ?? "").split("(")[0].trim().toUpperCase();
  const point = !isNaN(debit) && debit > 0 ? debit : credit;
  return { date, userid, point, upline };
}

export function formattype10(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const credit = absNum(row["Credit"]);
  const debit = absNum(row["Debit"]);
  const date = parseDate(
    String(row["Settled Date"] ?? ""),
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd HH:mm:ss"
  );
  const desc = String(row["Description"] ?? "");

  const t = desc[1];
  const s = desc[0]
  if (t !== "D" && t !== "W" && s !== "D" && s !== "W") return null;
  const userid = desc.split("(")[1].split(')')[0].split(' ')[2].trim().toUpperCase();
  const point = !isNaN(debit) && debit > 0 ? debit : credit;
  return { date, userid, point, upline };
}

export function formattype12(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const point = -parseFloat(String(row["ClientPL"] ?? "0").replace(/,/g, ""));
  const userid = String(row["User Name"] ?? "")
    .split(" ")[0]
    .trim()
    .toUpperCase();
  const date = new Date();
  return { date, userid, point, upline };
}

export function formattypezpdm(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const ut = String(row["UT"] ?? "").trim();
  const validUT = ["C", "S", " ", "M"];
  if (!validUT.includes(ut)) return null;
  const point = -toNum(row["CHIP"]);
  const userid = String(row["USERNAME"] ?? "")
    .split(" ")[0]
    .trim()
    .toUpperCase();
  const date = new Date();
  return { date, userid, point, upline };
}

export function formattype13(
  row: Record<string, unknown>,
  upline: string
): FormatterOutput | null {
  const credit = absNum(row["Credit"]);
  const debit = absNum(row["Debit"]);
  const date = parseDate(
    String(row["Settled Date"] ?? ""),
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm:ss",
    "M/d/yyyy HH:mm:ss"
  );
  const trans = toNum(row["Transaction ID"]);
  if (isNaN(trans) || trans === 0) return null;
  const desc = String(row["Description"] ?? "");
  const userid = (desc.split("-")[0] ?? "").trim().toUpperCase();
  const point = !isNaN(debit) && debit > 0 ? debit : credit;
  return { date, userid, point, upline };
}

// ── registry ──────────────────────────────────────────────────────────────────

export type FormatterName =
  | "formattype1"
  | "formattype2"
  | "formattype3"
  | "formattype4"
  | "formattype5"
  | "formattype6"
  | "formattype7"
  | "formattype8"
  | "formattype9"
  | "formattype10"
  | "formattype12"
  | "formattype13"
  | "formattypezpdm";

export const FORMATTER_REGISTRY: Record<
  FormatterName,
  (row: Record<string, unknown>, upline: string) => FormatterOutput | null
> = {
  formattype1,
  formattype2,
  formattype3,
  formattype4,
  formattype5,
  formattype6,
  formattype7,
  formattype8,
  formattype9,
  formattype10,
  formattype12,
  formattype13,
  formattypezpdm,
};

export const ALL_FORMATTER_NAMES: FormatterName[] = [
  "formattype1",
  "formattype2",
  "formattype3",
  "formattype4",
  "formattype5",
  "formattype6",
  "formattype7",
  "formattype8",
  "formattype9",
  "formattype10",
  "formattype12",
  "formattype13",
  "formattypezpdm",
];

// ── auto-detection patterns ───────────────────────────────────────────────────

interface FormatPattern {
  name: FormatterName;
  required: string[];
  optional: string[];
  priority: number;
}

export const FORMAT_PATTERNS: FormatPattern[] = [
  {
    name: "formattype1",
    required: ["Credit", "Debit", "Detail", "Time"],
    optional: [],
    priority: 0.7,
  },
  {
    name: "formattype2",
    required: ["Credit", "Debit", "Date", "FromTo"],
    optional: ["Description", "Remark"],
    priority: 0.86,
  },
  {
    name: "formattype3",
    required: ["withdraw", "Deposit", "DateTime", "To"],
    optional: [],
    priority: 0.85,
  },
  {
    name: "formattype4",
    required: ["amount", "createdAt"],
    optional: ["fromUserName", "toUserName"],
    priority: 0.85,
  },
  {
    name: "formattype5",
    required: ["Credit", "Debit", "Date Time", "From To"],
    optional: ["Description"],
    priority: 0.85,
  },
  {
    name: "formattype6",
    required: ["Credit", "Debit", "Date", "FromTo"],
    optional: [],
    priority: 0.85,
  },
  {
    name: "formattype7",
    required: ["Credit", "Debit", "Settled Date", "Transit ID", "Description"],
    optional: [],
    priority: 0.88,
  },
  {
    name: "formattype8",
    required: ["CR", "DR", "Date", "To"],
    optional: [],
    priority: 0.85,
  },
  {
    name: "formattype9",
    required: ["creditAmount", "debitAmount", "createdAt", "description"],
    optional: [],
    priority: 0.87,
  },
  {
    name: "formattype10",
    required: ["Credit", "Debit", "Settled Date", "Description"],
    optional: [],
    priority: 0.85,
  },
  {
    name: "formattype12",
    required: ["ClientPL", "User Name"],
    optional: [],
    priority: 0.75,
  },
  {
    name: "formattype13",
    required: [
      "Credit",
      "Debit",
      "Settled Date",
      "Transaction ID",
      "Description",
    ],
    optional: [],
    priority: 0.88,
  },
  {
    name: "formattypezpdm",
    required: ["UT", "CHIP", "USERNAME"],
    optional: [],
    priority: 0.8,
  },
];

export interface DetectionResult {
  formatter: FormatterName;
  score: number;
  confidence: number;
  allScores: Array<{ formatter: FormatterName; score: number }>;
}

export function detectFormatter(headers: string[]): DetectionResult {
  const normalizedHeaders = headers.map((h) => h.trim());
  const totalCols = normalizedHeaders.length;

  const scored = FORMAT_PATTERNS.map((pattern) => {
    const reqMatched = pattern.required.filter((r) =>
      normalizedHeaders.some(
        (h) => h.toLowerCase() === r.toLowerCase()
      )
    ).length;
    const optMatched = pattern.optional.filter((o) =>
      normalizedHeaders.some(
        (h) => h.toLowerCase() === o.toLowerCase()
      )
    ).length;

    const reqScore =
      pattern.required.length > 0
        ? reqMatched / pattern.required.length
        : 1;
    const optScore =
      pattern.optional.length > 0
        ? optMatched / pattern.optional.length
        : 1;
    const expectedCols =
      pattern.required.length + pattern.optional.length;
    const colProximity =
      expectedCols > 0
        ? 1 - Math.abs(totalCols - expectedCols) / Math.max(totalCols, expectedCols)
        : 1;

    const rawScore =
      reqScore * 0.6 + optScore * 0.2 + colProximity * 0.2;
    const finalScore = rawScore * pattern.priority;

    return { formatter: pattern.name, score: finalScore };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    formatter: best.formatter,
    score: best.score,
    confidence: Math.round(best.score * 100),
    allScores: scored,
  };
}
