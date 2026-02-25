"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/trpc";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, ArrowLeft, Download, ExternalLink } from "lucide-react";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "processed") return "default";
  if (status === "error") return "destructive";
  if (status === "processing") return "secondary";
  return "outline";
}

export default function SettlementDetailPage() {
  const params = useParams();
  const settleId = String(params.settleId);

  const { data: settlement, isLoading } = api.settlement.getById.useQuery({ settleId });
  const { data: recordsData, isLoading: recordsLoading } = api.process.readRecords.useQuery(
    { settleId },
    { enabled: true }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground">Settlement <span className="font-mono font-semibold">{settleId}</span> not found.</p>
        <Button variant="outline" asChild>
          <Link href="/settlements"><ArrowLeft className="h-4 w-4 mr-2" />Back to Settlements</Link>
        </Button>
      </div>
    );
  }

  const uploads = settlement.uploads;
  const exchGroups = uploads.reduce<Record<string, typeof uploads>>((acc, u) => {
    if (!acc[u.exch]) acc[u.exch] = [];
    acc[u.exch].push(u);
    return acc;
  }, {});

  const totalRecords = uploads.reduce((sum, u) => sum + (u.recordCount ?? 0), 0);
  const processedCount = uploads.filter((u) => u.status === "processed").length;

  const RECORD_COLS = ["PCODE", "DATE", "USERID", "IDNAME", "POINT", "AMT_GROSS", "AMT_COMM", "AMOUNT", "ADRCR"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1 text-muted-foreground">
            <Link href="/settlements"><ArrowLeft className="h-4 w-4 mr-1" />Settlements</Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{settlement.settleId}</h1>
            <Badge variant={settlement.status === "active" ? "default" : "secondary"}>
              {settlement.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Created {format(new Date(settlement.createdAt), "dd MMM yyyy, HH:mm")}
          </p>
        </div>
        <Button asChild>
          <Link href={`/settlements/${settleId}/upload`}>
            <Upload className="h-4 w-4 mr-2" />Upload &amp; Process File
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Uploads", value: uploads.length },
          { label: "Processed", value: processedCount },
          { label: "Records Written", value: totalRecords },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="uploads">
        <TabsList>
          <TabsTrigger value="uploads">Uploads</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>

        {/* ── Uploads tab ── */}
        <TabsContent value="uploads" className="mt-4">
          {uploads.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl">
              <p className="text-muted-foreground mb-3">No uploads yet.</p>
              <Button variant="outline" asChild>
                <Link href={`/settlements/${settleId}/upload`}>Upload a file</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(exchGroups).map(([exch, exchUploads]) => (
                <Card key={exch}>
                  <CardHeader className="py-3 px-5 border-b flex-row items-center gap-2 space-y-0">
                    <CardTitle className="text-sm font-semibold">{exch}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{exchUploads.length} files</Badge>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Upline</TableHead>
                          <TableHead>Filename</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Records</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exchUploads.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-mono text-xs">{u.upline}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                              {u.filename}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                              {format(new Date(u.uploadedAt), "dd MMM HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(u.status)} className="capitalize text-xs">
                                {u.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {u.recordCount ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {(u.status === "uploaded" || u.status === "processing") && (
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/settlements/${settleId}/process/${u.id}`}>
                                    Process
                                  </Link>
                                </Button>
                              )}
                              {u.status === "processed" && u.errorMsg && (
                                <span className="text-xs text-destructive">{u.errorMsg}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Records tab ── */}
        <TabsContent value="records" className="mt-4">
          {recordsLoading ? (
            <div className="space-y-2">
              {[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : !recordsData || recordsData.records.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl">
              <p className="text-muted-foreground">No records in {settleId} yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {recordsData.records.length} records
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/api/settlement/${settleId}/download-dbf`} download={`${settleId}.DBF`}>
                      <Download className="h-4 w-4 mr-1.5" />Download DBF
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/settlements/${settleId}/records`}>
                      <ExternalLink className="h-4 w-4 mr-1.5" />View all
                    </Link>
                  </Button>
                </div>
              </div>
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {RECORD_COLS.map((col) => (
                          <TableHead key={col} className="text-xs">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recordsData.records.slice(0, 50).map((r, i) => (
                        <TableRow key={i}>
                          {RECORD_COLS.map((col) => (
                            <TableCell key={col} className="font-mono text-xs">
                              {(r as Record<string, unknown>)[col] instanceof Date
                                ? format((r as Record<string, unknown>)[col] as Date, "dd/MM/yy")
                                : String((r as Record<string, unknown>)[col] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
              {recordsData.records.length > 50 && (
                <p className="text-xs text-center text-muted-foreground">
                  Showing 50 of {recordsData.records.length} records.{" "}
                  <Link href={`/settlements/${settleId}/records`} className="underline underline-offset-2">
                    View all
                  </Link>
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
