"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PartyMasterForm } from "@/components/forms/PartyMasterForm";
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

export default function PartyMasterPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<any>(null);
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

  const { data, isLoading } = api.partyMaster.getList.useQuery({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
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

  const handleEdit = (party: any) => {
    setEditingParty(party);
    setOpen(true);
  };

  const handleDelete = (partyCode: string) => {
    if (confirm("Are you sure you want to delete this party?")) {
      deleteMutation.mutate({ partyCode });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Party Master</h1>
        {canWrite && (
          <>
            <Button onClick={() => { setEditingParty(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Party
            </Button>
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) setEditingParty(null);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingParty ? "Edit" : "Create"} Party Master</DialogTitle>
                </DialogHeader>
                <PartyMasterForm
                  defaultValues={editingParty || undefined}
                  partyCode={editingParty?.partyCode}
                  onSuccess={() => {
                    setOpen(false);
                    utils.partyMaster.getList.invalidate();
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
          placeholder="Search code, name, ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No parties found. {canWrite && !search && "Create one to get started."}
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
                  <TableCell className="font-medium">{party.partyCode}</TableCell>
                  <TableCell>{party.partyName}</TableCell>
                  <TableCell>{party.ref || "-"}</TableCell>
                  <TableCell>{new Date(party.createdAt).toLocaleDateString()}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(party)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(party.partyCode)}>
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
