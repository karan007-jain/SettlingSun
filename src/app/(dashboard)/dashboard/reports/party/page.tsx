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

export default function PartyReportPage() {
  const [view, setView] = useState<"parties" | "idmasters">("parties");
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  
  const [partySearch, setPartySearch] = useState("");
  const [partyPage, setPartyPage] = useState(1);
  
  const [idMasterSearch, setIdMasterSearch] = useState("");
  const [idMasterPage, setIdMasterPage] = useState(1);

  const pageSize = 10;

  // Fetch parties
  const { data: partiesData, isLoading: loadingParties } = api.reports.getParties.useQuery({
    search: partySearch,
    page: partyPage,
    pageSize,
  });

  // Fetch ID Masters (only when parties are selected)
  const { data: idMastersData, isLoading: loadingIdMasters } = api.reports.getIdMastersByParty.useQuery(
    {
      partyCodes: selectedParties,
      search: idMasterSearch,
      page: idMasterPage,
      pageSize,
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

  const goBackToParties = () => {
    setView("parties");
    setSelectedParties([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Party-wise Report</h1>
          <p className="text-gray-600 mt-1">
            {view === "parties" && "Select parties to view ID masters"}
            {view === "idmasters" && "Viewing ID masters"}
          </p>
        </div>
        {view === "idmasters" && (
          <Button variant="outline" onClick={goBackToParties}>
            Back to Parties
          </Button>
        )}
      </div>

      {/* Parties View */}
      {view === "parties" && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search parties..."
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setPartyPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (partiesData?.data) {
                  const allCodes = partiesData.data.map((p: any) => p.partyCode);
                  const allSelected = allCodes.every((code: string) => selectedParties.includes(code));
                  if (allSelected) {
                    setSelectedParties(selectedParties.filter(code => !allCodes.includes(code)));
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
            <Button
              onClick={viewIdMasters}
              disabled={selectedParties.length === 0}
            >
              View ID Masters ({selectedParties.length})
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partiesData.data.map((party: any) => (
                      <TableRow key={party.partyCode}>
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
                        <TableCell>
                          {new Date(party.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-700">
                    Showing {(partyPage - 1) * pageSize + 1} to{" "}
                    {Math.min(partyPage * pageSize, partiesData.total)} of{" "}
                    {partiesData.total} results
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

      {/* ID Masters View */}
      {view === "idmasters" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search ID masters..."
              value={idMasterSearch}
              onChange={(e) => {
                setIdMasterSearch(e.target.value);
                setIdMasterPage(1);
              }}
              className="pl-10"
            />
          </div>

          <div className="bg-white rounded-lg shadow">
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

                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-700">
                    Showing {(idMasterPage - 1) * pageSize + 1} to{" "}
                    {Math.min(idMasterPage * pageSize, idMastersData.total)} of{" "}
                    {idMastersData.total} results
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
