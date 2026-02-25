"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc";
import { format } from "date-fns";
import { AddUserModal } from "@/components/forms/AddUserModal";
import { ALL_FORMATTER_NAMES, type FormatterName } from "@/lib/formatters";
import type { PreviewRow } from "@/server/api/routers/process";

type Step = 1 | 2 | 3;

export default function ProcessPage() {
  const params = useParams();
  const settleId = String(params.settleId);
  const uploadId = String(params.uploadId);

  const [step, setStep] = useState<Step>(1);
  const [stepError, setStepError] = useState("");

  // Step 1 — Formatter
  const [formatter, setFormatter] = useState<FormatterName>("formattype1");
  const [detectedFormatter, setDetectedFormatter] = useState<FormatterName>("formattype1");
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [detectionFromConfig, setDetectionFromConfig] = useState(false);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [existingUplineCount, setExistingUplineCount] = useState(0);

  // Step 2 — Preview
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [rawRows, setRawRows] = useState<{ rowIndex: number; data: Record<string, unknown> }[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [totalRows, setTotalRows] = useState(0);
  const [skipAllMissing, setSkipAllMissing] = useState(false);
  const [addUserFor, setAddUserFor] = useState<{ userid: string; upline: string } | null>(null);
  const [previewTab, setPreviewTab] = useState<"original" | "parsed">("original");

  // Load upload info
  const { data: uploads } = api.settlement.getUploads.useQuery({ settleId });
  const upload = uploads?.find((u) => u.id === uploadId);

  const detectFormatterQuery = api.process.detectFormatter.useQuery(
    { uploadId },
    { enabled: !!uploadId }
  );

  const parseAndPreviewMutation = api.process.parseAndPreview.useMutation({
    onSuccess: (data) => {
      setPreviewRows(data.previewRows as PreviewRow[]);
      setRawRows((data.rawRows ?? []) as { rowIndex: number; data: Record<string, unknown> }[]);
      setRawHeaders((data.headers ?? []) as string[]);
      setTotalRows(data.totalRows);
      setExistingUplineCount(data.existingUplineCount);
      const okIndexes = (data.previewRows as PreviewRow[])
        .filter((r) => r.status === "ok")
        .map((r) => r.rowIndex);
      setSelectedRows(new Set(okIndexes));
      setPreviewTab("original");
      setStep(2);
    },
    onError: (err) => setStepError(err.message),
  });

  const recalcMutation = api.process.recalculateRow.useMutation({
    onSuccess: (data) => {
      if (data) {
        setPreviewRows((prev) =>
          prev.map((r) => (r.rowIndex === data.rowIndex ? (data as PreviewRow) : r))
        );
        setSelectedRows((prev) => { const next = new Set(prev); next.add(data.rowIndex); return next; });
      }
    },
  });

  const confirmMutation = api.process.confirm.useMutation({
    onSuccess: () => setStep(3),
    onError: (err) => setStepError(err.message),
  });

  useEffect(() => {
    if (detectFormatterQuery.data) {
      const d = detectFormatterQuery.data;
      setDetectedFormatter(d.formatter as FormatterName);
      setFormatter(d.formatter as FormatterName);
      setDetectionConfidence(d.confidence);
      setDetectionFromConfig(d.fromConfig);
    }
  }, [detectFormatterQuery.data]);

  const handleParseAndPreview = () => {
    setStepError("");
    if (existingUplineCount > 0 && !duplicateConfirmed) {
      setShowDuplicateWarning(true);
      return;
    }
    parseAndPreviewMutation.mutate({ uploadId, formatter });
  };

  const handleConfirm = () => {
    setStepError("");
    if (selectedRows.size === 0) { setStepError("No rows selected."); return; }
    confirmMutation.mutate({ uploadId, formatter, selectedRowIndexes: Array.from(selectedRows) });
  };

  const handleAddUserClose = (rowIndex: number) => {
    setAddUserFor(null);
    recalcMutation.mutate({ uploadId, rowIndex, formatter });
  };

  const toggleRow = (idx: number) => {
    setSelectedRows((prev) => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; });
  };

  const toggleAll = () => {
    const okRows = previewRows.filter((r) => r.status === "ok").map((r) => r.rowIndex);
    setSelectedRows(selectedRows.size === okRows.length ? new Set() : new Set(okRows));
  };

  const stepLabels = ["Formatter", "Preview", "Done"];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/settlements" className="text-blue-600 hover:underline">Settlements</Link>
        <span className="text-gray-400">/</span>
        <Link href={`/settlements/${settleId}`} className="text-blue-600 hover:underline">{settleId}</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium">Process</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Process File</h1>
        {upload && (
          <div className="text-sm text-gray-500 text-right">
            <p><span className="font-medium text-gray-700">{upload.filename}</span></p>
            <p>EXCH: <strong>{upload.exch}</strong> · UPLINE: <strong>{upload.upline}</strong></p>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {stepLabels.map((label, i) => {
          const sn = (i + 1) as Step;
          const isDone = step > sn;
          const isCurrent = step === sn;
          return (
            <div key={label} className="flex items-center">
              <div className={`flex items-center gap-2 ${isDone || isCurrent ? "" : "opacity-40"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  isDone ? "bg-green-500 text-white" : isCurrent ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {isDone ? "✓" : sn}
                </div>
                <span className={`text-sm hidden sm:block ${isCurrent ? "font-semibold text-blue-700" : "text-gray-500"}`}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`h-0.5 w-8 mx-2 ${isDone ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white border rounded-xl p-6 max-w-5xl">

        {/* ── Step 1: Formatter detection ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Step 1 — Format Detection</h2>
              <p className="text-sm text-gray-500">Auto-detected formatter based on file headers and upline config.</p>
            </div>

            {detectFormatterQuery.isLoading ? (
              <div className="text-gray-400 text-sm py-4">Detecting format…</div>
            ) : detectFormatterQuery.data ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-blue-700">
                    {detectionFromConfig ? "📌 From config:" : "🔍 Detected:"}
                    {" "}<span className="font-mono font-bold">{detectedFormatter}</span>
                  </p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    Confidence: {detectionConfidence}%
                    {detectionFromConfig && " (exact match from FormatConfig)"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Override formatter (optional)</label>
                  <select
                    value={formatter}
                    onChange={(e) => setFormatter(e.target.value as FormatterName)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {ALL_FORMATTER_NAMES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Could not auto-detect. Select manually:</p>
                <select
                  value={formatter}
                  onChange={(e) => setFormatter(e.target.value as FormatterName)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {ALL_FORMATTER_NAMES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            )}

            {existingUplineCount > 0 && !duplicateConfirmed && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
                ⚠️ <strong>{existingUplineCount} records</strong> with this upline already exist in {settleId}.
                <button
                  onClick={() => { setDuplicateConfirmed(true); }}
                  className="ml-2 underline font-medium hover:no-underline"
                >
                  Continue anyway
                </button>
              </div>
            )}

            {stepError && <p className="text-red-600 text-sm">{stepError}</p>}

            <button
              onClick={handleParseAndPreview}
              disabled={parseAndPreviewMutation.isPending}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            >
              {parseAndPreviewMutation.isPending ? "Parsing…" : "Parse & Preview →"}
            </button>
          </div>
        )}

        {/* ── Step 2: Preview table ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Step 2 — Preview</h2>
                <p className="text-sm text-gray-500">
                  {totalRows} rows · {previewRows.filter((r) => r.status === "ok").length} OK ·{" "}
                  {previewRows.filter((r) => r.status === "user_missing").length} missing
                </p>
              </div>
              <div className="flex items-center gap-3">
                {previewRows.some((r) => r.status === "user_missing") && (
                  <button
                    onClick={() => setSkipAllMissing(!skipAllMissing)}
                    className={`text-sm px-3 py-1 rounded-lg border ${skipAllMissing ? "bg-gray-100 text-gray-600" : "text-amber-600 border-amber-300 hover:bg-amber-50"}`}
                  >
                    {skipAllMissing ? "⏭ Skip All (active)" : "⏭ Skip All Missing"}
                  </button>
                )}
                <span className="text-sm text-gray-500">{selectedRows.size} selected</span>
              </div>
            </div>

            {existingUplineCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                ⚠️ {existingUplineCount} existing records with this upline in {settleId}.
              </div>
            )}

            {/* Tab switcher */}
            <div className="flex border-b">
              <button
                onClick={() => setPreviewTab("original")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  previewTab === "original"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                📄 Original File
              </button>
              <button
                onClick={() => setPreviewTab("parsed")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  previewTab === "parsed"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                ✅ Parsed Result
              </button>
            </div>

            {/* ── Original file table ── */}
            {previewTab === "original" && (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-xs border-y min-w-max">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left border-b text-gray-500 font-medium">#</th>
                      {rawHeaders.map((h) => (
                        <th key={h} className="px-3 py-2 text-left border-b text-gray-600 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.map(({ rowIndex, data }) => (
                      <tr key={rowIndex} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-gray-400 font-mono">{rowIndex + 1}</td>
                        {rawHeaders.map((h) => (
                          <td key={h} className="px-3 py-1.5 font-mono whitespace-nowrap">
                            {data[h] === null || data[h] === undefined ? "" : String(data[h])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Parsed result table ── */}
            {previewTab === "parsed" && (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-xs border-y">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left border-b">
                        <input
                          type="checkbox"
                          checked={selectedRows.size === previewRows.filter((r) => r.status === "ok").length && previewRows.some((r) => r.status === "ok")}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-3 py-2 text-left border-b text-gray-600">#</th>
                      <th className="px-3 py-2 text-left border-b text-gray-600">Date</th>
                      <th className="px-3 py-2 text-left border-b text-gray-600">UserID</th>
                      <th className="px-3 py-2 text-right border-b text-gray-600">Point</th>
                      <th className="px-3 py-2 text-right border-b text-gray-600">AmtGross</th>
                      <th className="px-3 py-2 text-right border-b text-gray-600">AmtComm</th>
                      <th className="px-3 py-2 text-right border-b text-gray-600">AmtPati</th>
                      <th className="px-3 py-2 text-right border-b text-gray-600">Amount</th>
                      <th className="px-3 py-2 text-center border-b text-gray-600">CR/DR</th>
                      <th className="px-3 py-2 text-center border-b text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const isMissing = row.status === "user_missing";
                      const isSkipped = row.status === "skip" || (isMissing && skipAllMissing);
                      return (
                        <tr
                          key={row.rowIndex}
                          className={`border-b last:border-0 ${
                            isSkipped ? "bg-gray-50 opacity-50"
                            : isMissing ? "bg-yellow-50"
                            : selectedRows.has(row.rowIndex) ? "bg-blue-50"
                            : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-3 py-1.5">
                            {row.status === "ok" && (
                              <input type="checkbox" checked={selectedRows.has(row.rowIndex)} onChange={() => toggleRow(row.rowIndex)} className="rounded" />
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-gray-400">{row.rowIndex + 1}</td>
                          <td className="px-3 py-1.5 font-mono">{row.date ? format(new Date(row.date), "dd/MM/yy") : "—"}</td>
                          <td className="px-3 py-1.5 font-mono font-semibold">{row.userid}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{row.point?.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{row.amtGross?.toFixed(2) ?? "—"}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-red-600">{row.amtComm?.toFixed(2) ?? "—"}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{row.amtPati?.toFixed(2) ?? "—"}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold">{row.amount?.toFixed(2) ?? "—"}</td>
                          <td className="px-3 py-1.5 text-center font-mono">
                            {row.adrcr && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${row.adrcr === "C" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {row.adrcr}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {isMissing && !skipAllMissing && (
                              <button
                                onClick={() => setAddUserFor({ userid: row.userid, upline: row.upline })}
                                className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded hover:bg-amber-600"
                              >
                                + Add User
                              </button>
                            )}
                            {isMissing && row.foundInOtherUpline && (
                              <span className="text-xs text-blue-500 ml-1" title="Found in another upline">ℹ</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {stepError && <p className="text-red-600 text-sm">{stepError}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">← Back</button>
              <button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending || selectedRows.size === 0}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                {confirmMutation.isPending ? "Saving…" : `✓ Confirm & Save ${selectedRows.size} Records`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && confirmMutation.data && (
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl">✅</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Done!</h2>
              <p className="text-gray-500 mt-1">
                <span className="font-bold text-green-600 text-2xl">{confirmMutation.data.count}</span>{" "}
                records saved to database
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <a
                href={`/api/settlement/${settleId}/download-dbf`}
                download={`${settleId}.DBF`}
                className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                ↓ Download DBF
              </a>
              <Link
                href={`/settlements/${settleId}/records`}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                View All Records
              </Link>
              <Link
                href={`/settlements/${settleId}/upload`}
                className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                + Upload Another File
              </Link>
              <Link
                href={`/settlements/${settleId}`}
                className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Back to Settlement
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate warning modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-900 mb-2">⚠️ Duplicate Records Warning</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{existingUplineCount} record(s)</strong> with upline code &ldquo;{upload?.upline}&rdquo; already exist in{" "}
              <strong>{settleId}</strong>. Continue and add more?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDuplicateConfirmed(true);
                  setShowDuplicateWarning(false);
                  parseAndPreviewMutation.mutate({ uploadId, formatter });
                }}
                className="flex-1 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 text-sm font-medium"
              >
                Yes, Continue
              </button>
              <button onClick={() => setShowDuplicateWarning(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AddUser modal */}
      {addUserFor && (
        <AddUserModal
          userid={addUserFor.userid}
          upline={addUserFor.upline}
          idCode={upload?.exch ?? ""}
          onSave={() => {
            const row = previewRows.find((r) => r.userid === addUserFor.userid && r.status === "user_missing");
            if (row) handleAddUserClose(row.rowIndex);
            else setAddUserFor(null);
          }}
          onCancel={() => setAddUserFor(null)}
        />
      )}
    </div>
  );
}
