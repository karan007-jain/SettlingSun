"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc";
import { format } from "date-fns";
import { AddUserModal } from "@/components/forms/AddUserModal";
import { ALL_FORMATTER_NAMES, type FormatterName } from "@/lib/formatters";
import type { PreviewRow } from "@/server/api/routers/process";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
        <Link href="/settlements" className="hover:text-foreground transition-colors">Settlements</Link>
        <span>/</span>
        <Link href={`/settlements/${settleId}`} className="hover:text-foreground transition-colors">{settleId}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Process</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Process File</h1>
        {upload && (
          <div className="text-sm text-muted-foreground text-right">
            <p><span className="font-medium text-foreground">{upload.filename}</span></p>
            <p>EXCH: <Badge variant="secondary" className="font-mono">{upload.exch}</Badge> UPLINE: <Badge variant="secondary" className="font-mono">{upload.upline}</Badge></p>
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

      <div className="border rounded-xl p-6 max-w-5xl bg-card">

        {/* ── Step 1: Formatter detection ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold mb-1">Step 1 — Format Detection</h2>
              <p className="text-sm text-muted-foreground">Auto-detected formatter based on file headers and upline config.</p>
            </div>

            {detectFormatterQuery.isLoading ? (
              <div className="text-muted-foreground text-sm py-4">Detecting format…</div>
            ) : detectFormatterQuery.data ? (
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {detectionFromConfig ? "📌 From config:" : "🔍 Detected:"}
                    {" "}<span className="font-mono font-bold">{detectedFormatter}</span>
                  </p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    Confidence: {detectionConfidence}%
                    {detectionFromConfig && " (exact match from FormatConfig)"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Override formatter (optional)</label>
                  <Select value={formatter} onValueChange={(v) => setFormatter(v as FormatterName)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_FORMATTER_NAMES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-sm">Could not auto-detect. Select manually:</p>
                <Select value={formatter} onValueChange={(v) => setFormatter(v as FormatterName)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_FORMATTER_NAMES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {existingUplineCount > 0 && !duplicateConfirmed && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                ⚠️ <strong>{existingUplineCount} records</strong> with this upline already exist in {settleId}.
                <button
                  onClick={() => { setDuplicateConfirmed(true); }}
                  className="ml-2 underline font-medium hover:no-underline"
                >
                  Continue anyway
                </button>
              </div>
            )}

            {stepError && <p className="text-destructive text-sm">{stepError}</p>}

            <Button onClick={handleParseAndPreview} disabled={parseAndPreviewMutation.isPending}>
              {parseAndPreviewMutation.isPending ? "Parsing…" : "Parse & Preview →"}
            </Button>
          </div>
        )}

        {/* ── Step 2: Preview table ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Step 2 — Preview</h2>
                <p className="text-sm text-muted-foreground">
                  {totalRows} rows ·{" "}
                  <Badge variant="secondary" className="text-green-600">{previewRows.filter((r) => r.status === "ok").length} OK</Badge>{" "}
                  <Badge variant="secondary" className="text-amber-600">{previewRows.filter((r) => r.status === "user_missing").length} missing</Badge>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {previewRows.some((r) => r.status === "user_missing") && (
                  <Button
                    variant={skipAllMissing ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setSkipAllMissing(!skipAllMissing)}
                  >
                    {skipAllMissing ? "⏭ Skip All (active)" : "⏭ Skip All Missing"}
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">{selectedRows.size} selected</span>
              </div>
            </div>

            {existingUplineCount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                ⚠️ {existingUplineCount} existing records with this upline in {settleId}.
              </div>
            )}

            {/* Tab switcher */}
            <div className="flex border-b">
              <button
                onClick={() => setPreviewTab("original")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  previewTab === "original"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                📄 Original File
              </button>
              <button
                onClick={() => setPreviewTab("parsed")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  previewTab === "parsed"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                ✅ Parsed Result
              </button>
            </div>

            {/* ── Original file table ── */}
            {previewTab === "original" && (
              <div className="overflow-x-auto -mx-6">
                <Table className="text-xs min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      {rawHeaders.map((h) => (
                        <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawRows.map(({ rowIndex, data }) => (
                      <TableRow key={rowIndex}>
                        <TableCell className="font-mono text-muted-foreground">{rowIndex + 1}</TableCell>
                        {rawHeaders.map((h) => (
                          <TableCell key={h} className="font-mono whitespace-nowrap">
                            {data[h] === null || data[h] === undefined ? "" : String(data[h])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* ── Parsed result table ── */}
            {previewTab === "parsed" && (
              <div className="overflow-x-auto -mx-6">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedRows.size === previewRows.filter((r) => r.status === "ok").length && previewRows.some((r) => r.status === "ok")}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>UserID</TableHead>
                      <TableHead className="text-right">Point</TableHead>
                      <TableHead className="text-right">AmtGross</TableHead>
                      <TableHead className="text-right">AmtComm</TableHead>
                      <TableHead className="text-right">AmtPati</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">CR/DR</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row) => {
                      const isMissing = row.status === "user_missing";
                      const isSkipped = row.status === "skip" || (isMissing && skipAllMissing);
                      return (
                        <TableRow
                          key={row.rowIndex}
                          className={
                            isSkipped ? "opacity-40"
                            : isMissing ? "bg-amber-50 dark:bg-amber-950/40"
                            : selectedRows.has(row.rowIndex) ? "bg-blue-50 dark:bg-blue-950/40"
                            : ""
                          }
                        >
                          <TableCell>
                            {row.status === "ok" && (
                              <Checkbox
                                checked={selectedRows.has(row.rowIndex)}
                                onCheckedChange={() => toggleRow(row.rowIndex)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{row.rowIndex + 1}</TableCell>
                          <TableCell className="font-mono">{row.date ? format(new Date(row.date), "dd/MM/yy") : "—"}</TableCell>
                          <TableCell className="font-mono font-semibold">{row.userid}</TableCell>
                          <TableCell className="text-right font-mono">{row.point?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">{row.amtGross?.toFixed(2) ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono text-destructive">{row.amtComm?.toFixed(2) ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono">{row.amtPati?.toFixed(2) ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{row.amount?.toFixed(2) ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            {row.adrcr && (
                              <Badge variant={row.adrcr === "C" ? "secondary" : "destructive"} className={row.adrcr === "C" ? "text-green-600" : ""}>
                                {row.adrcr}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isMissing && !skipAllMissing && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs px-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                                onClick={() => setAddUserFor({ userid: row.userid, upline: row.upline })}
                              >
                                + Add User
                              </Button>
                            )}
                            {isMissing && row.foundInOtherUpline && (
                              <span className="text-xs text-blue-500 ml-1" title="Found in another upline">ℹ</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {stepError && <p className="text-destructive text-sm">{stepError}</p>}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending || selectedRows.size === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {confirmMutation.isPending ? "Saving…" : `✓ Confirm & Save ${selectedRows.size} Records`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && confirmMutation.data && (
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl">✅</div>
            <div>
              <h2 className="text-xl font-bold">Done!</h2>
              <p className="text-muted-foreground mt-1">
                <span className="font-bold text-green-600 text-2xl">{confirmMutation.data.count}</span>{" "}
                records saved to database
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <a href={`/api/settlement/${settleId}/download-dbf`} download={`${settleId}.DBF`}>
                  ↓ Download DBF
                </a>
              </Button>
              <Button asChild>
                <Link href={`/settlements/${settleId}/records`}>View All Records</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/settlements/${settleId}/upload`}>+ Upload Another File</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/settlements/${settleId}`}>Back to Settlement</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate warning modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold mb-2">⚠️ Duplicate Records Warning</h3>
            <p className="text-sm text-muted-foreground mb-4">
              <strong className="text-foreground">{existingUplineCount} record(s)</strong> with upline code &ldquo;{upload?.upline}&rdquo; already exist in{" "}
              <strong className="text-foreground">{settleId}</strong>. Continue and add more?
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  setDuplicateConfirmed(true);
                  setShowDuplicateWarning(false);
                  parseAndPreviewMutation.mutate({ uploadId, formatter });
                }}
              >
                Yes, Continue
              </Button>
              <Button variant="outline" onClick={() => setShowDuplicateWarning(false)}>Cancel</Button>
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
