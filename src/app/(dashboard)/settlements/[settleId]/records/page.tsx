"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc";
import { format } from "date-fns";

const DISPLAY_COLS = [
  "WEEK", "SODATYPE", "PCODE", "DATE", "USERID", "IDNAME", "IDSHORT",
  "IDPCODE", "IDRATE", "IDCOMM", "COMMISSION", "RATE", "PATI", "PARTNER",
  "POINT", "AMT_GROSS", "AMT_COMM", "AMT_PATI", "AMOUNT", "ADRCR", "TIME",
  "TALLY", "DIFFAMT",
];

export default function SettlementRecordsPage() {
  const params = useParams();
  const settleId = String(params.settleId);

  const { data, isLoading } = api.process.readRecords.useQuery({ settleId });

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href={`/settlements/${settleId}`} className="text-blue-600 hover:underline text-sm">
          ← {settleId}
        </Link>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          Records — {settleId}
        </h1>
        {data && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">{data.records.length} records</p>
            <a
              href={`/api/settlement/${settleId}/download-dbf`}
              download={`${settleId}.DBF`}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              ↓ Download DBF
            </a>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading records...</div>
      ) : !data || data.records.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed rounded-xl">
          <p className="text-gray-400">No records found for {settleId}.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border rounded-xl overflow-hidden">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left text-gray-500 border-b">#</th>
                {DISPLAY_COLS.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-gray-600 border-b whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.records.map((r, i) => (
                <tr key={i} className={`border-b last:border-0 hover:bg-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                  <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                  {DISPLAY_COLS.map((col) => {
                    const val = (r as Record<string, unknown>)[col];
                    let display = "";
                    if (val instanceof Date) {
                      display = format(val, "dd/MM/yyyy");
                    } else if (typeof val === "boolean") {
                      display = val ? "T" : "F";
                    } else if (val !== null && val !== undefined) {
                      display = String(val);
                    }
                    return (
                      <td key={col} className="px-3 py-1.5 text-gray-700 font-mono whitespace-nowrap">
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
