"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { IdMasterForm } from "@/components/forms/IdMasterForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { PaginationBar } from "@/components/PaginationBar";
import { DeleteAlertDialog } from "@/components/DeleteAlertDialog";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Search } from "lucide-react";

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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = api.idMaster.getList.useQuery({
    page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, filterActive, filterIsUpline,
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
  const canWrite = !!session?.user;

  const handleEdit = (id: any) => {
    const isRupee = id.exch?.currency === "RUPEE";
    setEditingId({
      id: id.id,
      userId: id.userId,
      partyCode: id.partyCode,
      idCode: id.idCode,
      comm: Number(id.comm),
      rate: isRupee ? Number(id.rate) / 100 : Number(id.rate),
      pati: id.pati,
      active: id.active,
      isUpline: id.isUpline,
      uplineId: id.uplineId,
    });
    setOpen(true);
  };

  const confirmDelete = () => { if (deleteTarget) deleteMutation.mutate({ id: deleteTarget }); };

  const cycleActiveFilter = () => { setFilterActive((v) => v === undefined ? true : v === true ? false : undefined); setPage(1); };
  const cycleUplineFilter = () => { setFilterIsUpline((v) => v === undefined ? true : v === true ? false : undefined); setPage(1); };
  const filterLabel = (val: boolean | undefined, t: string, f: string) => val === true ? t : val === false ? f : "All";
  const hasFilters = filterActive !== undefined || filterIsUpline !== undefined || !!search;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ID Master"
        description="Manage user IDs, uplines, and relationships"
        action={canWrite && (
          <Button onClick={() => { setEditingId(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New ID Master
          </Button>
        )}
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }}>
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

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete ID Master"
        description="This will permanently delete the ID Master record."
        onConfirm={confirmDelete}
      />

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search user ID, party, exchange..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant={filterActive === undefined ? "outline" : "default"} size="sm" onClick={cycleActiveFilter} className="min-w-[90px]">
          Active: {filterLabel(filterActive, "Yes", "No")}
        </Button>
        <Button variant={filterIsUpline === undefined ? "outline" : "default"} size="sm" onClick={cycleUplineFilter} className="min-w-[100px]">
          Upline: {filterLabel(filterIsUpline, "Yes", "No")}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterActive(undefined); setFilterIsUpline(undefined); setPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No ID Masters found.{canWrite && !search && " Create one to get started."}
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
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
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
                  <TableCell className="text-muted-foreground">{id.partnerParty?.partyName || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={id.active ? "default" : "secondary"} className="text-xs">
                      {id.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={id.isUpline ? "default" : "outline"} className="text-xs">
                      {id.isUpline ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{id.upline?.userId || "—"}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(id.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}

