"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ExchForm } from "@/components/forms/ExchForm";
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

export default function ExchPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [editingExch, setEditingExch] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = api.exch.getList.useQuery({
    page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const deleteMutation = api.exch.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Exchange deleted successfully" });
      utils.exch.getList.invalidate();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const isAdmin = session?.user?.role === "ADMIN";
  const canWrite = !!session?.user;

  const handleEdit = (exch: any) => {
    setEditingExch({
      id: exch.id,
      idName: exch.idName,
      partyCode: exch.partyCode,
      shortCode: exch.shortCode,
      rate: exch.currency === "RUPEE" ? Number(exch.rate) / 100 : Number(exch.rate),
      idComm: Number(exch.idComm),
      idAc: exch.idAc,
      currency: exch.currency ?? "PAISA",
      template: exch.template ?? "",
    });
    setOpen(true);
  };

  const confirmDelete = () => { if (deleteTarget) deleteMutation.mutate({ id: deleteTarget }); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exchange"
        description="Manage exchange rates and commissions"
        action={canWrite && (
          <Button onClick={() => { setEditingExch(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Exchange
          </Button>
        )}
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingExch(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingExch ? "Edit" : "Create"} Exchange</DialogTitle>
          </DialogHeader>
          <ExchForm
            defaultValues={editingExch || undefined}
            id={editingExch?.id}
            onSuccess={() => { setOpen(false); utils.exch.getList.invalidate(); }}
          />
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Exchange"
        description="This will permanently delete the exchange. Any ID Masters referencing it may be affected."
        onConfirm={confirmDelete}
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search ID name, short code, party..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No exchanges found.{canWrite && !search && " Create one to get started."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Name</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Short Code</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Comm</TableHead>
                <TableHead>ID Ac</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((exch: any) => (
                <TableRow key={exch.id}>
                  <TableCell className="font-medium">{exch.idName}</TableCell>
                  <TableCell>{exch.party.partyName}</TableCell>
                  <TableCell className="font-mono">{exch.shortCode}</TableCell>
                  <TableCell>
                    <Badge variant={exch.currency === "RUPEE" ? "default" : "secondary"} className="text-xs">
                      {exch.currency ?? "PAISA"}
                    </Badge>
                  </TableCell>
                  <TableCell>{Number(exch.rate).toFixed(2)}</TableCell>
                  <TableCell>{Number(exch.idComm).toFixed(2)}</TableCell>
                  <TableCell>{exch.idAcParty.partyName}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(exch)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(exch.id)}>
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


