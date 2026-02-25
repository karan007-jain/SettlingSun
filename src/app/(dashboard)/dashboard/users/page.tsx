"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { UserForm } from "@/components/forms/UserForm";
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
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Shield, User as UserIcon } from "lucide-react";

export default function UsersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: users = [], isLoading } = api.user.getAll.useQuery();

  const deleteMutation = api.user.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      utils.user.getAll.invalidate();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const isAdmin = session?.user?.role === "ADMIN";

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-600">Access denied. Admin only.</p>
      </div>
    );
  }

  const handleEdit = (user: any) => {
    setEditingUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "MANAGER":
        return "bg-blue-100 text-blue-800";
      case "USER":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: string) => {
    return role === "ADMIN" ? (
      <Shield className="h-4 w-4 inline mr-1" />
    ) : (
      <UserIcon className="h-4 w-4 inline mr-1" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={handleNewUser}>
          <Plus className="h-4 w-4 mr-2" />
          New User
        </Button>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setEditingUser(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit" : "Create"} User
              </DialogTitle>
            </DialogHeader>
            <UserForm
              defaultValues={editingUser || undefined}
              userId={editingUser?.id}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No users found. Create one to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {getRoleIcon(user.role)}
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
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
