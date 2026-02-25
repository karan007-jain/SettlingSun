"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "USER"]),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  defaultValues?: Partial<UserFormData & { id?: string }>;
  userId?: string;
  onSuccess?: () => void;
}

export function UserForm({ defaultValues, userId, onSuccess }: UserFormProps) {
  const { toast } = useToast();
  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      ...defaultValues,
      password: "", // Always start with empty password
    },
  });

  const createMutation = api.user.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      reset();
      utils.user.getAll.invalidate();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateMutation = api.user.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      utils.user.getAll.invalidate();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    if (userId) {
      // Update - only send password if it's not empty
      const updateData: any = {
        email: data.email,
        role: data.role,
      };
      
      if (data.password && data.password.length >= 6) {
        updateData.password = data.password;
      }

      updateMutation.mutate({
        id: userId,
        data: updateData,
      });
    } else {
      // Create - password is required
      if (!data.password || data.password.length < 6) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Password is required and must be at least 6 characters",
        });
        return;
      }

      createMutation.mutate({
        email: data.email,
        password: data.password,
        role: data.role,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="user@example.com"
        />
        {errors.email && (
          <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">
          Password {userId && "(leave blank to keep unchanged)"}
        </Label>
        <Input
          id="password"
          type="password"
          {...register("password")}
          placeholder={userId ? "Leave blank to keep current" : "Minimum 6 characters"}
        />
        {errors.password && (
          <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          {...register("role")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="USER">User</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </select>
        {errors.role && (
          <p className="text-sm text-destructive mt-1">{errors.role.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {userId ? "Update" : "Create"} User
      </Button>
    </form>
  );
}
