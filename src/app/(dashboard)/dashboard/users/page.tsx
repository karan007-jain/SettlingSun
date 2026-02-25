"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { UserForm } from "@/components/forms/UserForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { DeleteAlertDialog } from "@/components/DeleteAlertDialog";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, ShieldCheck, User as UserIcon, Shield } from "lucide-react";

export default function UsersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: users = [], isLoading } = api.user.getAll.useQuery();

  const deleteMutation = api.user.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "User deleted successfully" });
      utils.user.getAll.invalidate();
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-sm text-muted-foreground">Admin access is required.</p>
        </div>
      </div>
    );
  }

  const handleEdit = (user: any) => { setEditingUser({ id: user.id, email: user.email, role: user.role }); setOpen(true); };
  const confirmDelete = () => { if (deleteTarget) deleteMutation.mutate({ id: deleteTarget }); };

  const roleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    if (role === "ADMIN") return "default";
    if (role === "MANAGER") return "secondary";
    return "outline";
  };

  const RoleIcon = ({ role }: { role: string }) =>
    role === "ADMIN" ? <Shield className="h-3 w-3 mr-1" /> : <UserIcon className="h-3 w-3 mr-1" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users and their roles"
        action={
          <Button onClick={() => { setEditingUser(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New User
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit" : "Create"} User</DialogTitle>
          </DialogHeader>
          <UserForm
            defaultValues={editingUser || undefined}
            userId={editingUser?.id}
            onSuccess={() => { setOpen(false); utils.user.getAll.invalidate(); }}
          />
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete User"
        description="This will permanently delete the user account."
        onConfirm={confirmDelete}
      />

      <div className="rounded-lg border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (users as any[]).length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No users found. Create one to get started.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users as any[]).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(user.role)} className="gap-1 text-xs">
                      <RoleIcon role={user.role} />
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(user.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(user.id)}
                        disabled={user.id === session?.user?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

