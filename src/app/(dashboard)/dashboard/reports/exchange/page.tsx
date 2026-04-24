"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/trpc";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  ArrowUpDown,
  Filter,
} from "lucide-react";

type SortOrder = "asc" | "desc";

export default function ExchangeReportPage() {
  const [view, setView] = useState<"exchanges" | "uplines" | "downlines">("exchanges");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [selectedUplines, setSelectedUplines] = useState<string[]>([]);

  const [exchangeSearch, setExchangeSearch] = useState("");
  const [exchangePage, setExchangePage] = useState(1);
  const [exchangePageSize, setExchangePageSize] = useState(10);
  const [exchangeSortBy, setExchangeSortBy] = useState<
    "idName" | "shortCode" | "partyName" | "rate" | "idComm" | "idCount"
  >("idName");
  const [exchangeSortOrder, setExchangeSortOrder] = useState<SortOrder>("asc");
  const [exchangeHasIds, setExchangeHasIds] = useState<"all" | "yes" | "no">("all");
  const [exchangePartyCode, setExchangePartyCode] = useState("");

  const [uplineSearch, setUplineSearch] = useState("");
  const [uplinePage, setUplinePage] = useState(1);
  const [uplinePageSize, setUplinePageSize] = useState(10);
  const [uplineSortBy, setUplineSortBy] = useState<
    "userId" | "partyName" | "exchange" | "credit" | "comm" | "rate" | "active" | "downlines"
  >("userId");
  const [uplineSortOrder, setUplineSortOrder] = useState<SortOrder>("asc");
  const [uplineActive, setUplineActive] = useState<"all" | "active" | "inactive">("all");
  const [uplineHasPartner, setUplineHasPartner] = useState<"all" | "yes" | "no">("all");

  const [downlineSearch, setDownlineSearch] = useState("");
  const [downlinePage, setDownlinePage] = useState(1);
  const [downlinePageSize, setDownlinePageSize] = useState(10);
  const [downlineSortBy, setDownlineSortBy] = useState<
    "userId" | "uplineId" | "partyName" | "exchange" | "credit" | "comm" | "rate" | "partner" | "active"
  >("userId");
  const [downlineSortOrder, setDownlineSortOrder] = useState<SortOrder>("asc");
  const [downlineActive, setDownlineActive] = useState<"all" | "active" | "inactive">("all");
  const [downlineHasPartner, setDownlineHasPartner] = useState<"all" | "yes" | "no">("all");

  const { data: exchangesData, isLoading: loadingExchanges } = api.reports.getExchanges.useQuery({
    search: exchangeSearch,
    page: exchangePage,
    pageSize: exchangePageSize,
    sortBy: exchangeSortBy,
    sortOrder: exchangeSortOrder,
    hasIds: exchangeHasIds,
    partyCode: exchangePartyCode || undefined,
  });

  const { data: uplinesData, isLoading: loadingUplines } = api.reports.getUplinesByExchange.useQuery(
    {
      exchangeIdNames: selectedExchanges,
      search: uplineSearch,
      page: uplinePage,
      pageSize: uplinePageSize,
      sortBy: uplineSortBy,
      sortOrder: uplineSortOrder,
      active: uplineActive,
      hasPartner: uplineHasPartner,
    },
    { enabled: selectedExchanges.length > 0 && view === "uplines" }
  );

  const { data: downlinesData, isLoading: loadingDownlines } = api.reports.getDownlinesByUpline.useQuery(
    {
      uplineIds: selectedUplines,
      search: downlineSearch,
      page: downlinePage,
      pageSize: downlinePageSize,
      sortBy: downlineSortBy,
      sortOrder: downlineSortOrder,
      active: downlineActive,
      hasPartner: downlineHasPartner,
    },
    { enabled: selectedUplines.length > 0 && view === "downlines" }
  );

  const handleExchangeSelect = (exchangeIdName: string) => {
    setSelectedExchanges((prev) =>
      prev.includes(exchangeIdName)
        ? prev.filter((id) => id !== exchangeIdName)
        : [...prev, exchangeIdName]
    );
  };

  const handleUplineSelect = (uplineId: string) => {
    setSelectedUplines((prev) =>
      prev.includes(uplineId) ? prev.filter((id) => id !== uplineId) : [...prev, uplineId]
    );
  };

  const viewUplines = () => {
    if (selectedExchanges.length > 0) {
      setView("uplines");
      setUplinePage(1);
    }
  };

  const viewDownlines = () => {
    if (selectedUplines.length > 0) {
      setView("downlines");
      setDownlinePage(1);
    }
  };

  const quickViewUplines = (exchangeIdName: string) => {
    setSelectedExchanges([exchangeIdName]);
    setSelectedUplines([]);
    setView("uplines");
    setUplinePage(1);
  };

  const quickViewDownlines = (uplineId: string) => {
    setSelectedUplines([uplineId]);
    setView("downlines");
    setDownlinePage(1);
  };

  const goBackToExchanges = () => {
    setView("exchanges");
    setSelectedExchanges([]);
    setSelectedUplines([]);
  };

  const goBackToUplines = () => {
    setView("uplines");
    setSelectedUplines([]);
  };

  const resetExchangeFilters = () => {
    setExchangeSearch("");
    setExchangePage(1);
    setExchangePageSize(10);
    setExchangeSortBy("idName");
    setExchangeSortOrder("asc");
    setExchangeHasIds("all");
    setExchangePartyCode("");
  };

  const resetUplineFilters = () => {
    setUplineSearch("");
    setUplinePage(1);
    setUplinePageSize(10);
    setUplineSortBy("userId");
    setUplineSortOrder("asc");
    setUplineActive("all");
    setUplineHasPartner("all");
  };

  const resetDownlineFilters = () => {
    setDownlineSearch("");
    setDownlinePage(1);
    setDownlinePageSize(10);
    setDownlineSortBy("userId");
    setDownlineSortOrder("asc");
    setDownlineActive("all");
    setDownlineHasPartner("all");
  };

  const selectedExchangeLabel = useMemo(
    () => `${selectedExchanges.length} selected`,
    [selectedExchanges.length]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exchange-wise Report</h1>
          <p className="mt-1 text-gray-600">
            {view === "exchanges" && "Pick exchanges, then drill into uplines and downlines"}
            {view === "uplines" && "Filter and compare uplines across selected exchanges"}
            {view === "downlines" && "Analyze downlines for selected uplines"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Step: {view}</Badge>
            {view !== "downlines" && <Badge variant="outline">Exchanges: {selectedExchangeLabel}</Badge>}
            {view === "downlines" && <Badge variant="outline">Uplines: {selectedUplines.length} selected</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {view === "uplines" && (
            <Button variant="outline" onClick={goBackToExchanges}>
              Back to Exchanges
            </Button>
          )}
          {view === "downlines" && (
            <>
              <Button variant="outline" onClick={goBackToUplines}>
                Back to Uplines
              </Button>
              <Button variant="outline" onClick={goBackToExchanges}>
                Start Over
              </Button>
            </>
          )}
        </div>
      </div>

      {view === "exchanges" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="h-4 w-4" /> Filters and Sorting
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="relative md:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by id, short code, party"
                  value={exchangeSearch}
                  onChange={(e) => {
                    setExchangeSearch(e.target.value);
                    setExchangePage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Input
                placeholder="Party code"
                value={exchangePartyCode}
                onChange={(e) => {
                  setExchangePartyCode(e.target.value);
                  setExchangePage(1);
                }}
              />

              <Select
                value={exchangeHasIds}
                onValueChange={(v: "all" | "yes" | "no") => {
                  setExchangeHasIds(v);
                  setExchangePage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Has IDs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ID Counts</SelectItem>
                  <SelectItem value="yes">Has ID Masters</SelectItem>
                  <SelectItem value="no">No ID Masters</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={exchangeSortBy}
                onValueChange={(
                  v: "idName" | "shortCode" | "partyName" | "rate" | "idComm" | "idCount"
                ) => {
                  setExchangeSortBy(v);
                  setExchangePage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idName">Sort: ID Name</SelectItem>
                  <SelectItem value="shortCode">Sort: Short Code</SelectItem>
                  <SelectItem value="partyName">Sort: Party</SelectItem>
                  <SelectItem value="rate">Sort: Rate</SelectItem>
                  <SelectItem value="idComm">Sort: ID Comm</SelectItem>
                  <SelectItem value="idCount">Sort: ID Count</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Select
                  value={exchangeSortOrder}
                  onValueChange={(v: SortOrder) => {
                    setExchangeSortOrder(v);
                    setExchangePage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Asc</SelectItem>
                    <SelectItem value="desc">Desc</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(exchangePageSize)}
                  onValueChange={(v) => {
                    setExchangePageSize(Number(v));
                    setExchangePage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 rows</SelectItem>
                    <SelectItem value="25">25 rows</SelectItem>
                    <SelectItem value="50">50 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetExchangeFilters}>
                Reset Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (exchangesData?.data) {
                    const allIdNames = exchangesData.data.map((e: any) => e.idName);
                    const allSelected = allIdNames.every((idName: string) =>
                      selectedExchanges.includes(idName)
                    );
                    if (allSelected) {
                      setSelectedExchanges(selectedExchanges.filter((idName) => !allIdNames.includes(idName)));
                    } else {
                      setSelectedExchanges([...new Set([...selectedExchanges, ...allIdNames])]);
                    }
                  }
                }}
                disabled={!exchangesData?.data?.length}
              >
                {exchangesData?.data?.every((e: any) => selectedExchanges.includes(e.idName))
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              <Button onClick={viewUplines} disabled={selectedExchanges.length === 0}>
                View Uplines ({selectedExchanges.length})
              </Button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Tip: For single record, use row action "View Uplines" for one-click drill-down.
            </p>
          </div>

          <div className="rounded-lg bg-white shadow">
            {loadingExchanges ? (
              <div className="p-8 text-center">Loading...</div>
            ) : !exchangesData?.data.length ? (
              <div className="p-8 text-center text-gray-500">No exchanges found</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>ID Name</TableHead>
                      <TableHead>Short Code</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>ID Comm</TableHead>
                      <TableHead>ID Count</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangesData.data.map((exch: any) => (
                      <TableRow
                        key={exch.id}
                        onDoubleClick={() => quickViewUplines(exch.idName)}
                        className="cursor-pointer"
                        title="Double-click row to view uplines"
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedExchanges.includes(exch.idName)}
                            onCheckedChange={() => handleExchangeSelect(exch.idName)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{exch.idName}</TableCell>
                        <TableCell>{exch.shortCode}</TableCell>
                        <TableCell>{exch.party.partyName}</TableCell>
                        <TableCell>{Number(exch.rate).toFixed(2)}</TableCell>
                        <TableCell>{Number(exch.idComm).toFixed(2)}</TableCell>
                        <TableCell>{exch._count.idMasters}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => quickViewUplines(exch.idName)}
                          >
                            View Uplines
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-gray-700">
                    Showing {(exchangePage - 1) * exchangePageSize + 1} to{" "}
                    {Math.min(exchangePage * exchangePageSize, exchangesData.total)} of {" "}
                    {exchangesData.total} results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExchangePage((p) => Math.max(1, p - 1))}
                      disabled={exchangePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExchangePage((p) => p + 1)}
                      disabled={exchangePage >= exchangesData.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {view === "uplines" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <ArrowUpDown className="h-4 w-4" /> Upline Filters and Sorting
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="relative md:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search user, party, exchange"
                  value={uplineSearch}
                  onChange={(e) => {
                    setUplineSearch(e.target.value);
                    setUplinePage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Select
                value={uplineActive}
                onValueChange={(v: "all" | "active" | "inactive") => {
                  setUplineActive(v);
                  setUplinePage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Active status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={uplineHasPartner}
                onValueChange={(v: "all" | "yes" | "no") => {
                  setUplineHasPartner(v);
                  setUplinePage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Partner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partner States</SelectItem>
                  <SelectItem value="yes">Has Partner</SelectItem>
                  <SelectItem value="no">No Partner</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={uplineSortBy}
                onValueChange={(
                  v: "userId" | "partyName" | "exchange" | "credit" | "comm" | "rate" | "active" | "downlines"
                ) => {
                  setUplineSortBy(v);
                  setUplinePage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="userId">Sort: User ID</SelectItem>
                  <SelectItem value="partyName">Sort: Party</SelectItem>
                  <SelectItem value="exchange">Sort: Exchange</SelectItem>
                  <SelectItem value="credit">Sort: Credit</SelectItem>
                  <SelectItem value="comm">Sort: Comm</SelectItem>
                  <SelectItem value="rate">Sort: Rate</SelectItem>
                  <SelectItem value="active">Sort: Active</SelectItem>
                  <SelectItem value="downlines">Sort: Downlines</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Select
                  value={uplineSortOrder}
                  onValueChange={(v: SortOrder) => {
                    setUplineSortOrder(v);
                    setUplinePage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Asc</SelectItem>
                    <SelectItem value="desc">Desc</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(uplinePageSize)}
                  onValueChange={(v) => {
                    setUplinePageSize(Number(v));
                    setUplinePage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 rows</SelectItem>
                    <SelectItem value="25">25 rows</SelectItem>
                    <SelectItem value="50">50 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetUplineFilters}>
                Reset Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (uplinesData?.data) {
                    const allIds = uplinesData.data.map((u: any) => u.userId);
                    const allSelected = allIds.every((id: string) => selectedUplines.includes(id));
                    if (allSelected) {
                      setSelectedUplines(selectedUplines.filter((id) => !allIds.includes(id)));
                    } else {
                      setSelectedUplines([...new Set([...selectedUplines, ...allIds])]);
                    }
                  }
                }}
                disabled={!uplinesData?.data?.length}
              >
                {uplinesData?.data?.every((u: any) => selectedUplines.includes(u.userId))
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              <Button onClick={viewDownlines} disabled={selectedUplines.length === 0}>
                View Downlines ({selectedUplines.length})
              </Button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Tip: For single record, use row action "View Downlines" for one-click drill-down.
            </p>
          </div>

          <div className="rounded-lg bg-white shadow">
            {loadingUplines ? (
              <div className="p-8 text-center">Loading...</div>
            ) : !uplinesData?.data.length ? (
              <div className="p-8 text-center text-gray-500">No uplines found</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Exchange</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Comm</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Downlines</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uplinesData.data.map((upline: any) => (
                      <TableRow
                        key={upline.id}
                        onDoubleClick={() => quickViewDownlines(upline.userId)}
                        className="cursor-pointer"
                        title="Double-click row to view downlines"
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedUplines.includes(upline.userId)}
                            onCheckedChange={() => handleUplineSelect(upline.userId)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{upline.userId}</TableCell>
                        <TableCell>{upline.party.partyName}</TableCell>
                        <TableCell>{upline.exch.idName}</TableCell>
                        <TableCell>{Number(upline.credit).toFixed(2)}</TableCell>
                        <TableCell>{Number(upline.comm).toFixed(2)}</TableCell>
                        <TableCell>{Number(upline.rate).toFixed(2)}</TableCell>
                        <TableCell>
                          {upline.active ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>{upline._count.downlines}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => quickViewDownlines(upline.userId)}
                          >
                            View Downlines
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-gray-700">
                    Showing {(uplinePage - 1) * uplinePageSize + 1} to{" "}
                    {Math.min(uplinePage * uplinePageSize, uplinesData.total)} of {uplinesData.total} results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUplinePage((p) => Math.max(1, p - 1))}
                      disabled={uplinePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUplinePage((p) => p + 1)}
                      disabled={uplinePage >= uplinesData.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {view === "downlines" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <ArrowUpDown className="h-4 w-4" /> Downline Filters and Sorting
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="relative md:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search user, upline, party, exchange"
                  value={downlineSearch}
                  onChange={(e) => {
                    setDownlineSearch(e.target.value);
                    setDownlinePage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Select
                value={downlineActive}
                onValueChange={(v: "all" | "active" | "inactive") => {
                  setDownlineActive(v);
                  setDownlinePage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Active status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={downlineHasPartner}
                onValueChange={(v: "all" | "yes" | "no") => {
                  setDownlineHasPartner(v);
                  setDownlinePage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Partner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partner States</SelectItem>
                  <SelectItem value="yes">Has Partner</SelectItem>
                  <SelectItem value="no">No Partner</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={downlineSortBy}
                onValueChange={(
                  v: "userId" | "uplineId" | "partyName" | "exchange" | "credit" | "comm" | "rate" | "partner" | "active"
                ) => {
                  setDownlineSortBy(v);
                  setDownlinePage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="userId">Sort: User ID</SelectItem>
                  <SelectItem value="uplineId">Sort: Upline ID</SelectItem>
                  <SelectItem value="partyName">Sort: Party</SelectItem>
                  <SelectItem value="exchange">Sort: Exchange</SelectItem>
                  <SelectItem value="credit">Sort: Credit</SelectItem>
                  <SelectItem value="comm">Sort: Comm</SelectItem>
                  <SelectItem value="rate">Sort: Rate</SelectItem>
                  <SelectItem value="partner">Sort: Partner</SelectItem>
                  <SelectItem value="active">Sort: Active</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Select
                  value={downlineSortOrder}
                  onValueChange={(v: SortOrder) => {
                    setDownlineSortOrder(v);
                    setDownlinePage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Asc</SelectItem>
                    <SelectItem value="desc">Desc</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(downlinePageSize)}
                  onValueChange={(v) => {
                    setDownlinePageSize(Number(v));
                    setDownlinePage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 rows</SelectItem>
                    <SelectItem value="25">25 rows</SelectItem>
                    <SelectItem value="50">50 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Button variant="outline" onClick={resetDownlineFilters}>
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-white shadow">
            {loadingDownlines ? (
              <div className="p-8 text-center">Loading...</div>
            ) : !downlinesData?.data.length ? (
              <div className="p-8 text-center text-gray-500">No downlines found</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Upline</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Exchange</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Comm</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {downlinesData.data.map((downline: any) => (
                      <TableRow key={downline.id}>
                        <TableCell className="font-medium">{downline.userId}</TableCell>
                        <TableCell>{downline.upline?.userId || "-"}</TableCell>
                        <TableCell>{downline.party.partyName}</TableCell>
                        <TableCell>{downline.exch.idName}</TableCell>
                        <TableCell>{Number(downline.credit).toFixed(2)}</TableCell>
                        <TableCell>{Number(downline.comm).toFixed(2)}</TableCell>
                        <TableCell>{Number(downline.rate).toFixed(2)}</TableCell>
                        <TableCell>{downline.partnerParty?.partyName || "-"}</TableCell>
                        <TableCell>
                          {downline.active ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-gray-700">
                    Showing {(downlinePage - 1) * downlinePageSize + 1} to{" "}
                    {Math.min(downlinePage * downlinePageSize, downlinesData.total)} of {downlinesData.total} results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDownlinePage((p) => Math.max(1, p - 1))}
                      disabled={downlinePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDownlinePage((p) => p + 1)}
                      disabled={downlinePage >= downlinesData.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
