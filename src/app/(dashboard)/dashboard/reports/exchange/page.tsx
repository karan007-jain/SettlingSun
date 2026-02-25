"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/trpc";
import { Search, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

export default function ExchangeReportPage() {
  const [view, setView] = useState<"exchanges" | "uplines" | "downlines">("exchanges");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]); // Now stores idName values
  const [selectedUplines, setSelectedUplines] = useState<string[]>([]); // Stores userId values
  
  const [exchangeSearch, setExchangeSearch] = useState("");
  const [exchangePage, setExchangePage] = useState(1);
  
  const [uplineSearch, setUplineSearch] = useState("");
  const [uplinePage, setUplinePage] = useState(1);
  
  const [downlineSearch, setDownlineSearch] = useState("");
  const [downlinePage, setDownlinePage] = useState(1);

  const pageSize = 10;

  // Fetch exchanges
  const { data: exchangesData, isLoading: loadingExchanges } = api.reports.getExchanges.useQuery({
    search: exchangeSearch,
    page: exchangePage,
    pageSize,
  });

  // Fetch uplines (only when exchanges are selected)
  const { data: uplinesData, isLoading: loadingUplines } = api.reports.getUplinesByExchange.useQuery(
    {
      exchangeIdNames: selectedExchanges,
      search: uplineSearch,
      page: uplinePage,
      pageSize,
    },
    { enabled: selectedExchanges.length > 0 && view === "uplines" }
  );

  // Fetch downlines (only when uplines are selected)
  const { data: downlinesData, isLoading: loadingDownlines } = api.reports.getDownlinesByUpline.useQuery(
    {
      uplineIds: selectedUplines,
      search: downlineSearch,
      page: downlinePage,
      pageSize,
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
      prev.includes(uplineId)
        ? prev.filter((id) => id !== uplineId)
        : [...prev, uplineId]
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

  const goBackToExchanges = () => {
    setView("exchanges");
    setSelectedExchanges([]);
    setSelectedUplines([]);
  };

  const goBackToUplines = () => {
    setView("uplines");
    setSelectedUplines([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Exchange-wise Report</h1>
          <p className="text-gray-600 mt-1">
            {view === "exchanges" && "Select exchanges to view uplines"}
            {view === "uplines" && "Select uplines to view downlines"}
            {view === "downlines" && "Viewing downlines"}
          </p>
        </div>
        <div className="flex gap-2">
          {view === "uplines" && (
            <Button variant="outline" onClick={goBackToExchanges}>
              Back to Exchanges
            </Button>
          )}
          {view === "downlines" && (
            <Button variant="outline" onClick={goBackToUplines}>
              Back to Uplines
            </Button>
          )}
        </div>
      </div>

      {/* Exchanges View */}
      {view === "exchanges" && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search exchanges..."
                value={exchangeSearch}
                onChange={(e) => {
                  setExchangeSearch(e.target.value);
                  setExchangePage(1);
                }}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (exchangesData?.data) {
                  const allIdNames = exchangesData.data.map((e: any) => e.idName);
                  const allSelected = allIdNames.every((idName: string) => selectedExchanges.includes(idName));
                  if (allSelected) {
                    setSelectedExchanges(selectedExchanges.filter(idName => !allIdNames.includes(idName)));
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
            <Button
              onClick={viewUplines}
              disabled={selectedExchanges.length === 0}
            >
              View Uplines ({selectedExchanges.length})
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangesData.data.map((exch: any) => (
                      <TableRow key={exch.id}>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-700">
                    Showing {(exchangePage - 1) * pageSize + 1} to{" "}
                    {Math.min(exchangePage * pageSize, exchangesData.total)} of{" "}
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

      {/* Uplines View */}
      {view === "uplines" && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search uplines..."
                value={uplineSearch}
                onChange={(e) => {
                  setUplineSearch(e.target.value);
                  setUplinePage(1);
                }}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (uplinesData?.data) {
                  const allIds = uplinesData.data.map((u: any) => u.userId);
                  const allSelected = allIds.every((id: string) => selectedUplines.includes(id));
                  if (allSelected) {
                    setSelectedUplines(selectedUplines.filter(id => !allIds.includes(id)));
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
            <Button
              onClick={viewDownlines}
              disabled={selectedUplines.length === 0}
            >
              View Downlines ({selectedUplines.length})
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uplinesData.data.map((upline: any) => (
                      <TableRow key={upline.id}>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-700">
                    Showing {(uplinePage - 1) * pageSize + 1} to{" "}
                    {Math.min(uplinePage * pageSize, uplinesData.total)} of{" "}
                    {uplinesData.total} results
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

      {/* Downlines View */}
      {view === "downlines" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search downlines..."
              value={downlineSearch}
              onChange={(e) => {
                setDownlineSearch(e.target.value);
                setDownlinePage(1);
              }}
              className="pl-10"
            />
          </div>

          <div className="bg-white rounded-lg shadow">
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

                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-700">
                    Showing {(downlinePage - 1) * pageSize + 1} to{" "}
                    {Math.min(downlinePage * pageSize, downlinesData.total)} of{" "}
                    {downlinesData.total} results
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
