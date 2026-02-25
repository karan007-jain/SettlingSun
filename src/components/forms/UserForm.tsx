"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

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
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          placeholder="user@example.com"
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Password{" "}
          {userId && <span className="text-muted-foreground text-xs">(leave blank to keep unchanged)</span>}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete={userId ? "new-password" : "new-password"}
            {...register("password")}
            placeholder={userId ? "Leave blank to keep current" : "Minimum 6 characters"}
            className="pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
      </div>

      <Separator />

      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {userId ? "Update" : "Create"} User
      </Button>
    </form>
  );
}
