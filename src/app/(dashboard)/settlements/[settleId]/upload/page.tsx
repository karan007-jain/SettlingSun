"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc";

type Step = 1 | 2;

export default function UploadPage() {
  const params = useParams();
  const settleId = String(params.settleId);

  const [step, setStep] = useState<Step>(1);
  const [stepError, setStepError] = useState("");

  // Step 1 — UPLINE
  const [upline, setUpline] = useState("");
  const [exch, setExch] = useState(""); // derived from selected upline's idCode
  const [uplineSearch, setUplineSearch] = useState("");
  const [showUplineSuggestions, setShowUplineSuggestions] = useState(false);
  const { data: uplineList } = api.config.getUplines.useQuery();

  // Step 2 — File
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [doneUploadId, setDoneUploadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uplineSuggestions = (uplineList ?? []).filter((u) =>
    u.userId.toLowerCase().includes(uplineSearch.toLowerCase())
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) { setUploadError("Please select a file"); return; }
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("settleId", settleId);
      formData.append("exch", exch);
      formData.append("upline", upline);
      const res = await fetch("/api/settlement/upload", { method: "POST", body: formData });
      const json = await res.json() as { uploadId?: string; error?: string };
      if (!res.ok) { setUploadError(json.error ?? "Upload failed"); return; }
      setDoneUploadId(json.uploadId ?? "");
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
    }
  }, [selectedFile, settleId, exch, upline]);

  const stepLabels = ["UPLINE", "Upload"];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/settlements" className="text-blue-600 hover:underline">Settlements</Link>
        <span className="text-gray-400">/</span>
        <Link href={`/settlements/${settleId}`} className="text-blue-600 hover:underline">{settleId}</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium">Upload File</span>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-5">Upload File</h1>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {stepLabels.map((label, i) => {
          const sn = (i + 1) as Step;
          const isDone = !!doneUploadId || step > sn;
          const isCurrent = !doneUploadId && step === sn;
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

      <div className="bg-white border rounded-xl p-6 max-w-xl">

        {/* ── Upload done ── */}
        {doneUploadId && (
          <div className="text-center py-6 space-y-4">
            <div className="text-4xl">✅</div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">File uploaded!</h2>
              <p className="text-gray-500 text-sm mt-1">
                <strong>{selectedFile?.name}</strong> saved for upline{" "}
                <strong>{upline}</strong>
                {exch && <> · exchange <strong>{exch}</strong></>}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link
                href={`/settlements/${settleId}/process/${doneUploadId}`}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Process Now →
              </Link>
              <button
                onClick={() => {
                  setDoneUploadId(null); setStep(1);
                  setUpline(""); setUplineSearch(""); setExch("");
                  setSelectedFile(null);
                }}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                + Upload Another
              </button>
              <Link href={`/settlements/${settleId}`} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Back to Settlement
              </Link>
            </div>
          </div>
        )}

        {/* ── Step 1: UPLINE ── */}
        {!doneUploadId && step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Step 1 — Select UPLINE</h2>
              <p className="text-sm text-gray-500">Upline ID from ID Master (isUpline = true). The exchange will be derived automatically.</p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={uplineSearch}
                onChange={(e) => {
                  setUplineSearch(e.target.value);
                  setUpline(e.target.value.toUpperCase());
                  setExch("");
                  setShowUplineSuggestions(true);
                }}
                onFocus={() => setShowUplineSuggestions(true)}
                onBlur={() => setTimeout(() => setShowUplineSuggestions(false), 150)}
                placeholder="Search upline ID e.g. JAMES10, ZEXCH1551"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoFocus
              />
              {showUplineSuggestions && uplineSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 border rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                  {uplineSuggestions.map((u) => (
                    <button
                      key={u.userId}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setUpline(u.userId.toUpperCase());
                        setUplineSearch(u.userId);
                        setExch(u.idCode);
                        setShowUplineSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between items-center"
                    >
                      <span className="font-mono font-semibold">{u.userId}</span>
                      <span className="text-xs text-gray-400">exch: {u.idCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {upline && (
              <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                Selected: <strong>{upline}</strong>
                {exch && <span className="ml-2 text-gray-500">· Exchange: <strong className="text-gray-700">{exch}</strong></span>}
              </p>
            )}
            {stepError && <p className="text-red-600 text-sm">{stepError}</p>}
            <button
              onClick={() => {
                if (!upline.trim()) { setStepError("UPLINE is required"); return; }
                setStepError("");
                setStep(2);
              }}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 2: Upload file ── */}
        {!doneUploadId && step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Step 2 — Upload File</h2>
              <p className="text-sm text-gray-500">
                Select a <strong>.xlsx</strong>, <strong>.csv</strong>, or <strong>.html</strong> statement file.
              </p>
              <div className="mt-2 flex gap-3 text-xs text-gray-500">
                <span>Upline: <strong className="text-gray-800">{upline}</strong></span>
                {exch && <><span>·</span><span>Exchange: <strong className="text-gray-800">{exch}</strong></span></>}
              </div>
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setSelectedFile(f); }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors"
            >
              {selectedFile ? (
                <div>
                  <div className="text-2xl mb-2">📄</div>
                  <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2 text-gray-300">📁</div>
                  <p className="text-gray-500 font-medium">Drag & drop or click to select</p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx, .csv, .html supported</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.html,.htm"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }}
            />
            {uploadError && <p className="text-red-600 text-sm">{uploadError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">← Back</button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload File →"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

