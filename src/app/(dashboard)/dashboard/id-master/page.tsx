"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { IdMasterForm } from "@/components/forms/IdMasterForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

const PAGE_SIZE = 10;

export default function IdMasterPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [filterIsUpline, setFilterIsUpline] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = api.idMaster.getList.useQuery({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    filterActive,
    filterIsUpline,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const deleteMutation = api.idMaster.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "ID Master deleted successfully" });
      utils.idMaster.getList.invalidate();
      utils.idMaster.getUplines.invalidate();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const isAdmin = session?.user?.role === "ADMIN";

  const handleEdit = (id: any) => {
    setEditingId({
      id: id.id,
      userId: id.userId,
      partyCode: id.partyCode,
      idCode: id.idCode,
      comm: Number(id.comm),
      rate: Number(id.rate),
      pati: id.pati,
      active: id.active,
      isUpline: id.isUpline,
      uplineId: id.uplineId,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this ID Master?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Cycle filter: undefined -> true -> false -> undefined
  const cycleActiveFilter = () => {
    setFilterActive((v) => v === undefined ? true : v === true ? false : undefined);
    setPage(1);
  };
  const cycleUplineFilter = () => {
    setFilterIsUpline((v) => v === undefined ? true : v === true ? false : undefined);
    setPage(1);
  };

  const filterLabel = (val: boolean | undefined, trueLabel: string, falseLabel: string) =>
    val === true ? trueLabel : val === false ? falseLabel : "All";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ID Master</h1>
        {isAdmin && (
          <>
            <Button onClick={() => { setEditingId(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New ID Master
            </Button>
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) setEditingId(null);
            }}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit" : "Create"} ID Master</DialogTitle>
                </DialogHeader>
                <IdMasterForm
                  defaultValues={editingId || undefined}
                  id={editingId?.id}
                  onSuccess={() => {
                    setOpen(false);
                    utils.idMaster.getList.invalidate();
                    utils.idMaster.getUplines.invalidate();
                  }}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search user ID, party, exchange..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-72"
          />
        </div>
        <Button
          variant={filterActive === undefined ? "outline" : "default"}
          size="sm"
          onClick={cycleActiveFilter}
          className="min-w-[90px]"
        >
          Active: {filterLabel(filterActive, "Yes", "No")}
        </Button>
        <Button
          variant={filterIsUpline === undefined ? "outline" : "default"}
          size="sm"
          onClick={cycleUplineFilter}
          className="min-w-[100px]"
        >
          Upline: {filterLabel(filterIsUpline, "Yes", "No")}
        </Button>
        {(filterActive !== undefined || filterIsUpline !== undefined || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setFilterActive(undefined); setFilterIsUpline(undefined); setPage(1); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No ID Masters found. {isAdmin && !search && "Create one to get started."}
          </div>
        ) : (
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
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((id: any) => (
                <TableRow key={id.id}>
                  <TableCell className="font-medium">{id.userId}</TableCell>
                  <TableCell>{id.party.partyName}</TableCell>
                  <TableCell>{id.exch.idName}</TableCell>
                  <TableCell>{Number(id.comm).toFixed(2)}</TableCell>
                  <TableCell>{Number(id.rate).toFixed(2)}</TableCell>
                  <TableCell>{id.partnerParty?.partyName || "-"}</TableCell>
                  <TableCell>
                    {id.active ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                  </TableCell>
                  <TableCell>
                    {id.isUpline ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                  </TableCell>
                  <TableCell>{id.upline?.userId || "-"}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(id.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {total === 0
            ? "No results"
            : `${(page - 1) * PAGE_SIZE + 1}\u2013${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="px-2">Page {page} of {Math.max(1, totalPages)}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
