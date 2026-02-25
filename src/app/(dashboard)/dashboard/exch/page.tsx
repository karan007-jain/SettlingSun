"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ExchForm } from "@/components/forms/ExchForm";
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
import { Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = api.exch.getList.useQuery({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this exchange?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Exchange</h1>
        {canWrite && (
          <>
            <Button onClick={() => { setEditingExch(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Exchange
            </Button>
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) setEditingExch(null);
            }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingExch ? "Edit" : "Create"} Exchange</DialogTitle>
                </DialogHeader>
                <ExchForm
                  defaultValues={editingExch || undefined}
                  id={editingExch?.id}
                  onSuccess={() => {
                    setOpen(false);
                    utils.exch.getList.invalidate();
                  }}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search ID name, short code, party..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No exchanges found. {canWrite && !search && "Create one to get started."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Name</TableHead>
                <TableHead>Party Code</TableHead>
                <TableHead>Short Code</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>ID Comm</TableHead>
                <TableHead>ID Ac</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((exch: any) => (
                <TableRow key={exch.id}>
                  <TableCell className="font-medium">{exch.idName}</TableCell>
                  <TableCell>{exch.party.partyName}</TableCell>
                  <TableCell>{exch.shortCode}</TableCell>
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
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(exch.id)}>
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

