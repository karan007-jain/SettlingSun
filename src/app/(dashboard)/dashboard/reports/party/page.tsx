"use client";

import { useState } from "react";
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
  Filter,
  ArrowUpDown,
} from "lucide-react";

type SortOrder = "asc" | "desc";

export default function PartyReportPage() {
  const [view, setView] = useState<"parties" | "idmasters">("parties");
  const [selectedParties, setSelectedParties] = useState<string[]>([]);

  const [partySearch, setPartySearch] = useState("");
  const [partyPage, setPartyPage] = useState(1);
  const [partyPageSize, setPartyPageSize] = useState(10);
  const [partySortBy, setPartySortBy] = useState<
    "partyCode" | "partyName" | "ref" | "idCount" | "createdAt"
  >("partyName");
  const [partySortOrder, setPartySortOrder] = useState<SortOrder>("asc");
  const [partyHasRef, setPartyHasRef] = useState<"all" | "yes" | "no">("all");

  const [idMasterSearch, setIdMasterSearch] = useState("");
  const [idMasterPage, setIdMasterPage] = useState(1);
  const [idMasterPageSize, setIdMasterPageSize] = useState(10);
  const [idMasterSortBy, setIdMasterSortBy] = useState<
    "userId" | "partyName" | "exchange" | "comm" | "rate" | "partner" | "active" | "isUpline" | "uplineId"
  >("userId");
  const [idMasterSortOrder, setIdMasterSortOrder] = useState<SortOrder>("asc");
  const [idMasterActive, setIdMasterActive] = useState<"all" | "active" | "inactive">("all");
  const [idMasterUplineFilter, setIdMasterUplineFilter] = useState<"all" | "upline" | "downline">("all");
  const [idMasterHasPartner, setIdMasterHasPartner] = useState<"all" | "yes" | "no">("all");

  const { data: partiesData, isLoading: loadingParties } = api.reports.getParties.useQuery({
    search: partySearch,
    page: partyPage,
    pageSize: partyPageSize,
    sortBy: partySortBy,
    sortOrder: partySortOrder,
    hasRef: partyHasRef,
  });

  const { data: idMastersData, isLoading: loadingIdMasters } = api.reports.getIdMastersByParty.useQuery(
    {
      partyCodes: selectedParties,
      search: idMasterSearch,
      page: idMasterPage,
      pageSize: idMasterPageSize,
      sortBy: idMasterSortBy,
      sortOrder: idMasterSortOrder,
      active: idMasterActive,
      isUplineFilter: idMasterUplineFilter,
      hasPartner: idMasterHasPartner,
    },
    { enabled: selectedParties.length > 0 && view === "idmasters" }
  );

  const handlePartySelect = (partyCode: string) => {
    setSelectedParties((prev) =>
      prev.includes(partyCode)
        ? prev.filter((code) => code !== partyCode)
        : [...prev, partyCode]
    );
  };

  const viewIdMasters = () => {
    if (selectedParties.length > 0) {
      setView("idmasters");
      setIdMasterPage(1);
    }
  };

  const quickViewIdMasters = (partyCode: string) => {
    setSelectedParties([partyCode]);
    setView("idmasters");
    setIdMasterPage(1);
  };

  const goBackToParties = () => {
    setView("parties");
    setSelectedParties([]);
  };

  const resetPartyFilters = () => {
    setPartySearch("");
    setPartyPage(1);
    setPartyPageSize(10);
    setPartySortBy("partyName");
    setPartySortOrder("asc");
    setPartyHasRef("all");
  };

  const resetIdMasterFilters = () => {
    setIdMasterSearch("");
    setIdMasterPage(1);
    setIdMasterPageSize(10);
    setIdMasterSortBy("userId");
    setIdMasterSortOrder("asc");
    setIdMasterActive("all");
    setIdMasterUplineFilter("all");
    setIdMasterHasPartner("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Party-wise Report</h1>
          <p className="mt-1 text-gray-600">
            {view === "parties" && "Select parties and drill into ID Masters"}
            {view === "idmasters" && "Filter and sort ID Masters for selected parties"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Step: {view}</Badge>
            <Badge variant="outline">Parties selected: {selectedParties.length}</Badge>
          </div>
        </div>
        {view === "idmasters" && (
          <Button variant="outline" onClick={goBackToParties}>
            Back to Parties
          </Button>
        )}
      </div>

      {view === "parties" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="h-4 w-4" /> Filters and Sorting
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="relative md:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by code, name, ref"
                  value={partySearch}
                  onChange={(e) => {
                    setPartySearch(e.target.value);
                    setPartyPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Select
                value={partyHasRef}
                onValueChange={(v: "all" | "yes" | "no") => {
                  setPartyHasRef(v);
                  setPartyPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Reference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reference States</SelectItem>
                  <SelectItem value="yes">Has Reference</SelectItem>
                  <SelectItem value="no">No Reference</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={partySortBy}
                onValueChange={(v: "partyCode" | "partyName" | "ref" | "idCount" | "createdAt") => {
                  setPartySortBy(v);
                  setPartyPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partyCode">Sort: Party Code</SelectItem>
                  <SelectItem value="partyName">Sort: Party Name</SelectItem>
                  <SelectItem value="ref">Sort: Reference</SelectItem>
                  <SelectItem value="idCount">Sort: ID Count</SelectItem>
                  <SelectItem value="createdAt">Sort: Created Date</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Select
                  value={partySortOrder}
                  onValueChange={(v: SortOrder) => {
                    setPartySortOrder(v);
                    setPartyPage(1);
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
                  value={String(partyPageSize)}
                  onValueChange={(v) => {
                    setPartyPageSize(Number(v));
                    setPartyPage(1);
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
              <Button variant="outline" onClick={resetPartyFilters}>
                Reset Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (partiesData?.data) {
                    const allCodes = partiesData.data.map((p: any) => p.partyCode);
                    const allSelected = allCodes.every((code: string) => selectedParties.includes(code));
                    if (allSelected) {
                      setSelectedParties(selectedParties.filter((code) => !allCodes.includes(code)));
                    } else {
                      setSelectedParties([...new Set([...selectedParties, ...allCodes])]);
                    }
                  }
                }}
                disabled={!partiesData?.data?.length}
              >
                {partiesData?.data?.every((p: any) => selectedParties.includes(p.partyCode))
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              <Button onClick={viewIdMasters} disabled={selectedParties.length === 0}>
                View ID Masters ({selectedParties.length})
              </Button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Tip: For single record, use row action "View ID Masters" for one-click drill-down.
            </p>
          </div>

          <div className="rounded-lg bg-white shadow">
            {loadingParties ? (
              <div className="p-8 text-center">Loading...</div>
            ) : !partiesData?.data.length ? (
              <div className="p-8 text-center text-gray-500">No parties found</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Party Code</TableHead>
                      <TableHead>Party Name</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>ID Masters Count</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partiesData.data.map((party: any) => (
                      <TableRow
                        key={party.partyCode}
                        onDoubleClick={() => quickViewIdMasters(party.partyCode)}
                        className="cursor-pointer"
                        title="Double-click row to view ID Masters"
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedParties.includes(party.partyCode)}
                            onCheckedChange={() => handlePartySelect(party.partyCode)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{party.partyCode}</TableCell>
                        <TableCell>{party.partyName}</TableCell>
                        <TableCell>{party.ref || "-"}</TableCell>
                        <TableCell>{party._count.idMasters}</TableCell>
                        <TableCell>{new Date(party.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => quickViewIdMasters(party.partyCode)}
                          >
                            View ID Masters
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-gray-700">
                    Showing {(partyPage - 1) * partyPageSize + 1} to {" "}
                    {Math.min(partyPage * partyPageSize, partiesData.total)} of {partiesData.total} results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPartyPage((p) => Math.max(1, p - 1))}
                      disabled={partyPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPartyPage((p) => p + 1)}
                      disabled={partyPage >= partiesData.totalPages}
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

      {view === "idmasters" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <ArrowUpDown className="h-4 w-4" /> ID Master Filters and Sorting
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="relative md:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search user, party, exchange, upline"
                  value={idMasterSearch}
                  onChange={(e) => {
                    setIdMasterSearch(e.target.value);
                    setIdMasterPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Select
                value={idMasterActive}
                onValueChange={(v: "all" | "active" | "inactive") => {
                  setIdMasterActive(v);
                  setIdMasterPage(1);
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
                value={idMasterUplineFilter}
                onValueChange={(v: "all" | "upline" | "downline") => {
                  setIdMasterUplineFilter(v);
                  setIdMasterPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="upline">Uplines Only</SelectItem>
                  <SelectItem value="downline">Downlines Only</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={idMasterHasPartner}
                onValueChange={(v: "all" | "yes" | "no") => {
                  setIdMasterHasPartner(v);
                  setIdMasterPage(1);
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
                value={idMasterSortBy}
                onValueChange={(
                  v: "userId" | "partyName" | "exchange" | "comm" | "rate" | "partner" | "active" | "isUpline" | "uplineId"
                ) => {
                  setIdMasterSortBy(v);
                  setIdMasterPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="userId">Sort: User ID</SelectItem>
                  <SelectItem value="partyName">Sort: Party</SelectItem>
                  <SelectItem value="exchange">Sort: Exchange</SelectItem>
                  <SelectItem value="comm">Sort: Comm</SelectItem>
                  <SelectItem value="rate">Sort: Rate</SelectItem>
                  <SelectItem value="partner">Sort: Partner</SelectItem>
                  <SelectItem value="active">Sort: Active</SelectItem>
                  <SelectItem value="isUpline">Sort: Is Upline</SelectItem>
                  <SelectItem value="uplineId">Sort: Upline ID</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Select
                  value={idMasterSortOrder}
                  onValueChange={(v: SortOrder) => {
                    setIdMasterSortOrder(v);
                    setIdMasterPage(1);
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
                  value={String(idMasterPageSize)}
                  onValueChange={(v) => {
                    setIdMasterPageSize(Number(v));
                    setIdMasterPage(1);
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
              <Button variant="outline" onClick={resetIdMasterFilters}>
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-white shadow">
            {loadingIdMasters ? (
              <div className="p-8 text-center">Loading...</div>
            ) : !idMastersData?.data.length ? (
              <div className="p-8 text-center text-gray-500">No ID masters found</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Exchange</TableHead>
                      <TableHead>Comm</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Upline</TableHead>
                      <TableHead>Upline ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {idMastersData.data.map((id: any) => (
                      <TableRow key={id.id}>
                        <TableCell className="font-medium">{id.userId}</TableCell>
                        <TableCell>{id.party.partyName}</TableCell>
                        <TableCell>{id.exch.idName}</TableCell>
                        <TableCell>{Number(id.comm).toFixed(2)}</TableCell>
                        <TableCell>{Number(id.rate).toFixed(2)}</TableCell>
                        <TableCell>{id.partnerParty?.partyName || "-"}</TableCell>
                        <TableCell>
                          {id.active ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          {id.isUpline ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>{id.upline?.userId || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-gray-700">
                    Showing {(idMasterPage - 1) * idMasterPageSize + 1} to {" "}
                    {Math.min(idMasterPage * idMasterPageSize, idMastersData.total)} of {idMastersData.total} results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIdMasterPage((p) => Math.max(1, p - 1))}
                      disabled={idMasterPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIdMasterPage((p) => p + 1)}
                      disabled={idMasterPage >= idMastersData.totalPages}
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
