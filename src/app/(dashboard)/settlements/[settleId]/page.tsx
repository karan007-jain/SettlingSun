"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/trpc";
import { format } from "date-fns";

type TabKey = "uploads" | "records";

export default function SettlementDetailPage() {
  const params = useParams();
  const settleId = String(params.settleId);
  const [tab, setTab] = useState<TabKey>("uploads");

  const { data: settlement, isLoading } = api.settlement.getById.useQuery({
    settleId,
  });
  const { data: recordsData, isLoading: recordsLoading } =
    api.process.readRecords.useQuery(
      { settleId },
      { enabled: tab === "records" }
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Settlement {settleId} not found.</p>
        <Link href="/settlements" className="text-blue-600 hover:underline text-sm">
          ← Back to settlements
        </Link>
      </div>
    );
  }

  const uploads = settlement.uploads;
  const exchGroups = uploads.reduce<Record<string, typeof uploads>>(
    (acc, u) => {
      if (!acc[u.exch]) acc[u.exch] = [];
      acc[u.exch].push(u);
      return acc;
    },
    {}
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/settlements" className="text-blue-600 hover:underline text-sm">
              ← Settlements
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{settlement.settleId}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Created {format(new Date(settlement.createdAt), "dd MMM yyyy, HH:mm")} ·{" "}
            <span className={`font-medium ${settlement.status === "active" ? "text-green-600" : "text-gray-500"}`}>
              {settlement.status}
            </span>
          </p>
        </div>
        <Link
          href={`/settlements/${settleId}/upload`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          + Upload &amp; Process File
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Uploads", value: uploads.length },
          {
            label: "Processed",
            value: uploads.filter((u) => u.status === "processed").length,
          },
          {
            label: "Records Written",
            value: uploads.reduce((sum, u) => sum + (u.recordCount ?? 0), 0),
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border rounded-xl p-4">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b mb-4">
        <div className="flex gap-4">
          {(["uploads", "records"] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "uploads" && (
        <div>
          {uploads.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
              <p className="text-gray-400">No uploads yet.</p>
              <Link
                href={`/settlements/${settleId}/upload`}
                className="text-blue-600 hover:underline text-sm mt-2 inline-block"
              >
                Upload a file →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(exchGroups).map(([exch, exchUploads]) => (
                <div key={exch} className="bg-white border rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{exch}</span>
                    <span className="text-xs text-gray-400">({exchUploads.length} files)</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500">
                        <th className="text-left px-4 py-2">Upline</th>
                        <th className="text-left px-4 py-2">Filename</th>
                        <th className="text-left px-4 py-2">Uploaded</th>
                        <th className="text-left px-4 py-2">Status</th>
                        <th className="text-right px-4 py-2">Records</th>
                        <th className="text-right px-4 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exchUploads.map((u) => (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{u.upline}</td>
                          <td className="px-4 py-2 text-gray-600 max-w-[200px] truncate">
                            {u.filename}
                          </td>
                          <td className="px-4 py-2 text-gray-400 text-xs">
                            {format(new Date(u.uploadedAt), "dd MMM HH:mm")}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                u.status === "processed"
                                  ? "bg-green-100 text-green-700"
                                  : u.status === "error"
                                  ? "bg-red-100 text-red-700"
                                  : u.status === "processing"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-gray-600">
                            {u.recordCount ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {(u.status === "uploaded" || u.status === "processing") && (
                              <Link
                                href={`/settlements/${settleId}/process/${u.id}`}
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Process →
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "records" && (
        <div>
          {recordsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading records...</div>
          ) : !recordsData || recordsData.records.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
              <p className="text-gray-400">
                No records in {settleId} yet.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">
                  {recordsData.records.length} records
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={`/api/settlement/${settleId}/download-dbf`}
                    download={`${settleId}.DBF`}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    ↓ Download DBF
                  </a>
                  <Link
                    href={`/settlements/${settleId}/records`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View full table →
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border rounded-xl overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      {["PCODE", "DATE", "USERID", "IDNAME", "POINT", "AMT_GROSS", "AMT_COMM", "AMOUNT", "ADRCR", "TIME"].map(
                        (col) => (
                          <th key={col} className="px-3 py-2 text-left font-medium text-gray-600 border-b">
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {recordsData.records.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        {["PCODE", "DATE", "USERID", "IDNAME", "POINT", "AMT_GROSS", "AMT_COMM", "AMOUNT", "ADRCR", "TIME"].map(
                          (col) => (
                            <td key={col} className="px-3 py-1.5 text-gray-700 font-mono">
                              {(r as Record<string, unknown>)[col] instanceof Date
                                ? format((r as Record<string, unknown>)[col] as Date, "dd/MM/yy")
                                : String((r as Record<string, unknown>)[col] ?? "")}
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recordsData.records.length > 50 && (
                  <p className="text-xs text-center text-gray-400 py-2">
                    Showing 50 of {recordsData.records.length} records.{" "}
                    <Link href={`/settlements/${settleId}/records`} className="text-blue-600 hover:underline">
                      View all →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
