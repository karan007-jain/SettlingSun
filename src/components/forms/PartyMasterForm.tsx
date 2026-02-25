"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

const partyMasterSchema = z.object({
  partyCode: z.string()
    .length(6, "Party Code must be exactly 6 characters")
    .regex(/^[A-Z0-9]+$/, "Party Code must be alphanumeric (A-Z, 0-9)")
    .toUpperCase(),
  partyName: z.string().max(15, "Party Name must be at most 15 characters"),
  ref: z.string().max(15, "Ref must be at most 15 characters").optional(),
});

type PartyMasterFormData = z.infer<typeof partyMasterSchema>;

interface PartyMasterFormProps {
  defaultValues?: Partial<PartyMasterFormData>;
  partyCode?: string;
  onSuccess?: () => void;
}

export function PartyMasterForm({ defaultValues, partyCode, onSuccess }: PartyMasterFormProps) {
  const { toast } = useToast();
  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PartyMasterFormData>({
    resolver: zodResolver(partyMasterSchema),
    defaultValues,
  });

  const createMutation = api.partyMaster.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Party Master created successfully",
      });
      reset();
      utils.partyMaster.getAll.invalidate();
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

  const updateMutation = api.partyMaster.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Party Master updated successfully",
      });
      utils.partyMaster.getAll.invalidate();
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

  const onSubmit = (data: PartyMasterFormData) => {
    if (partyCode) {
      updateMutation.mutate({
        partyCode,
        data: {
          partyName: data.partyName,
          ref: data.ref,
        },
      });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="partyCode">Party Code</Label>
        <Input
          id="partyCode"
          {...register("partyCode")}
          disabled={!!partyCode}
          maxLength={6}
          className="uppercase"
          placeholder="6 alphanumeric characters"
          pattern="[A-Z0-9]{6}"
        />
        {errors.partyCode && (
          <p className="text-sm text-destructive mt-1">{errors.partyCode.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="partyName">Party Name</Label>
        <Input
          id="partyName"
          {...register("partyName")}
          maxLength={15}
          placeholder="Max 15 characters"
        />
        {errors.partyName && (
          <p className="text-sm text-destructive mt-1">{errors.partyName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="ref">Reference (Optional)</Label>
        <Input
          id="ref"
          {...register("ref")}
          maxLength={15}
          placeholder="Max 15 characters"
        />
        {errors.ref && (
          <p className="text-sm text-destructive mt-1">{errors.ref.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {partyCode ? "Update" : "Create"} Party Master
      </Button>
    </form>
  );
}
