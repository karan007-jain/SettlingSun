import path from "path";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { detectFormatter, type DetectionResult } from "./formatters";

export interface ParsedFile {
  rows: Record<string, unknown>[];
  headers: string[];
  detection: DetectionResult;
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    let v: unknown = value;
    // Strip Excel formula text wrapper: ="..." → ...
    if (typeof v === "string") {
      const m = /^="(.*)"$/.exec(v.trim());
      if (m) v = m[1];
    }
    normalized[key.trim()] = v;
  }
  return normalized;
}

function isSpecialStatement(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.includes("master statement") || lower.includes("super statement");
}

/**
 * Parse a file from an in-memory Buffer — serverless-safe, no filesystem reads.
 */
export function parseBuffer(buffer: Buffer, filename: string): ParsedFile {
  const ext = path.extname(filename).toLowerCase();
  let rows: Record<string, unknown>[];

  if (ext === ".csv") {
    const content = buffer.toString("utf-8");
    const result = Papa.parse<Record<string, unknown>>(content, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string) => value.replace(/,/g, ""),
    });
    rows = result.data.map(normalizeRow);
  } else if (ext === ".html" || ext === ".htm") {
    const content = buffer.toString("utf-8");
    const workbook = XLSX.read(content, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { rows: [], headers: [], detection: { formatter: "formattype1", score: 0, confidence: 0, allScores: [] } };
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    rows = json.map(normalizeRow);
  } else {
    // xlsx/xls
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { rows: [], headers: [], detection: { formatter: "formattype1", score: 0, confidence: 0, allScores: [] } };
    const sheet = workbook.Sheets[sheetName];
    const headerRow = isSpecialStatement(filename) ? 2 : 1;
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
      range: headerRow - 1,
    });
    rows = json.map(normalizeRow);
  }

  rows = rows.filter((row) =>
    Object.values(row).some((v) => v !== null && v !== undefined && String(v).trim() !== "")
  );

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const detection = detectFormatter(headers);
  return { rows, headers, detection };
}


