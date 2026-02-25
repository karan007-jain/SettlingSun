"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PartyMasterForm } from "@/components/forms/PartyMasterForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { PaginationBar } from "@/components/PaginationBar";
import { DeleteAlertDialog } from "@/components/DeleteAlertDialog";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Search } from "lucide-react";

const PAGE_SIZE = 10;

export default function PartyMasterPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = api.partyMaster.getList.useQuery({
    page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const deleteMutation = api.partyMaster.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Party Master deleted successfully" });
      utils.partyMaster.getList.invalidate();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const isAdmin = session?.user?.role === "ADMIN";
  const canWrite = !!session?.user;

  const handleEdit = (party: any) => { setEditingParty(party); setOpen(true); };
  const confirmDelete = () => { if (deleteTarget) deleteMutation.mutate({ partyCode: deleteTarget }); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Party Master"
        description="Manage party codes and names"
        action={canWrite && (
          <Button onClick={() => { setEditingParty(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Party
          </Button>
        )}
      />

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingParty(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingParty ? "Edit" : "Create"} Party Master</DialogTitle>
          </DialogHeader>
          <PartyMasterForm
            defaultValues={editingParty || undefined}
            partyCode={editingParty?.partyCode}
            onSuccess={() => { setOpen(false); utils.partyMaster.getList.invalidate(); }}
          />
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Party"
        description="This will permanently delete the party and cannot be undone."
        onConfirm={confirmDelete}
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search code, name, ref..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No parties found.{canWrite && !search && " Create one to get started."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party Code</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Created At</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((party: any) => (
                <TableRow key={party.partyCode}>
                  <TableCell className="font-mono font-medium">{party.partyCode}</TableCell>
                  <TableCell>{party.partyName}</TableCell>
                  <TableCell className="text-muted-foreground">{party.ref || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(party.createdAt).toLocaleDateString()}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(party)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(party.partyCode)}>
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

