"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Upload, ArrowLeft, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = 1 | 2;

export default function UploadPage() {
  const params = useParams();
  const settleId = String(params.settleId);

  const [step, setStep] = useState<Step>(1);
  const [stepError, setStepError] = useState("");

  // Step 1 — UPLINE combobox
  const [upline, setUpline] = useState("");
  const [exch, setExch] = useState("");
  const [uplineSearch, setUplineSearch] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const { data: uplineList = [], isFetching: uplineLoading } =
    api.config.getUplines.useQuery({ search: uplineSearch });

  // Step 2 — File
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [doneUploadId, setDoneUploadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const stepLabels = ["Select Upline", "Upload File"];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/settlements" className="hover:text-foreground transition-colors">Settlements</Link>
        <span>/</span>
        <Link href={`/settlements/${settleId}`} className="hover:text-foreground transition-colors">{settleId}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Upload File</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload File</h1>
        <p className="text-muted-foreground text-sm mt-1">Select an upline then upload a statement file.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => {
          const sn = (i + 1) as Step;
          const isDone = !!doneUploadId || step > sn;
          const isCurrent = !doneUploadId && step === sn;
          return (
            <div key={label} className="flex items-center">
              <div className={cn("flex items-center gap-2", !isDone && !isCurrent && "opacity-40")}>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                  isDone ? "bg-green-500 text-white" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {isDone ? <Check className="h-4 w-4" /> : sn}
                </div>
                <span className={cn("text-sm hidden sm:block", isCurrent ? "font-semibold" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={cn("h-0.5 w-8 mx-2", isDone ? "bg-green-400" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      <Card className="max-w-xl">
        <CardContent className="pt-6">

          {/* ── Done ── */}
          {doneUploadId && (
            <div className="text-center py-4 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h2 className="text-lg font-bold">File uploaded!</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  <strong>{selectedFile?.name}</strong> saved for upline <strong>{upline}</strong>
                  {exch && <> · exchange <strong>{exch}</strong></>}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <Button asChild>
                  <Link href={`/settlements/${settleId}/process/${doneUploadId}`}>
                    Process Now
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => {
                  setDoneUploadId(null); setStep(1);
                  setUpline(""); setUplineSearch(""); setExch("");
                  setSelectedFile(null);
                }}>
                  Upload Another
                </Button>
                <Button variant="ghost" asChild>
                  <Link href={`/settlements/${settleId}`}>
                    <ArrowLeft className="h-4 w-4 mr-1" />Back to Settlement
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 1: UPLINE ── */}
          {!doneUploadId && step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold mb-0.5">Step 1 — Select Upline</h2>
                <p className="text-sm text-muted-foreground">Choose an upline from ID Master. The exchange will be derived automatically.</p>
              </div>

              <div className="space-y-2">
                <Label>Upline</Label>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboOpen}
                      className={cn("w-full justify-between font-normal", !upline && "text-muted-foreground")}
                    >
                      <span className="truncate">
                        {upline ? (
                          <span className="flex items-center gap-2">
                            <span className="font-mono font-semibold">{upline}</span>
                            {exch && <Badge variant="secondary" className="text-xs">{exch}</Badge>}
                          </span>
                        ) : "Search upline ID…"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search upline ID…"
                        onValueChange={setUplineSearch}
                      />
                      <CommandList>
                        {uplineLoading ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
                        ) : (
                          <>
                            <CommandEmpty>No uplines found.</CommandEmpty>
                            <CommandGroup>
                              {uplineList.map((u) => (
                                <CommandItem
                                  key={u.userId}
                                  value={u.userId}
                                  onSelect={() => {
                                    setUpline(u.userId);
                                    setExch(u.idCode);
                                    setComboOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", upline === u.userId ? "opacity-100" : "opacity-0")} />
                                  <span className="font-mono font-semibold flex-1">{u.userId}</span>
                                  <span className="text-xs text-muted-foreground ml-2">exch: {u.idCode}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {stepError && <p className="text-sm text-destructive">{stepError}</p>}

              <Button
                onClick={() => {
                  if (!upline.trim()) { setStepError("Please select an upline"); return; }
                  setStepError("");
                  setStep(2);
                }}
              >
                Next
              </Button>
            </div>
          )}

          {/* ── Step 2: Upload file ── */}
          {!doneUploadId && step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold mb-0.5">Step 2 — Upload File</h2>
                <p className="text-sm text-muted-foreground">
                  Select a <strong>.xlsx</strong>, <strong>.csv</strong>, or <strong>.html</strong> statement file.
                </p>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>Upline: <strong className="text-foreground font-mono">{upline}</strong></span>
                  {exch && <><span>·</span><span>Exchange: <strong className="text-foreground">{exch}</strong></span></>}
                </div>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setSelectedFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  selectedFile ? "border-primary/40 bg-primary/5" : "hover:bg-accent hover:border-primary/30"
                )}
              >
                {selectedFile ? (
                  <div>
                    <FileText className="h-10 w-10 mx-auto mb-2 text-primary" />
                    <p className="font-semibold">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(1)} KB · Click to change</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">Drag &amp; drop or click to select</p>
                    <p className="text-xs text-muted-foreground mt-1">.xlsx, .csv, .html supported</p>
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

              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />Back
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? "Uploading…" : "Upload File"}
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
