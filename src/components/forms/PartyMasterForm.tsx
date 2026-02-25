"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="partyCode">
            Party Code <span className="text-muted-foreground text-xs">(exactly 6 chars)</span>
          </Label>
          <Input
            id="partyCode"
            {...register("partyCode")}
            disabled={!!partyCode}
            maxLength={6}
            className="uppercase font-mono"
            placeholder="e.g. ABCD01"
          />
          {errors.partyCode && (
            <p className="text-xs text-destructive">{errors.partyCode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="partyName">
            Party Name <span className="text-muted-foreground text-xs">(max 15)</span>
          </Label>
          <Input
            id="partyName"
            {...register("partyName")}
            maxLength={15}
            placeholder="Party display name"
          />
          {errors.partyName && (
            <p className="text-xs text-destructive">{errors.partyName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ref">
          Reference <span className="text-muted-foreground text-xs">(optional, max 15)</span>
        </Label>
        <Input
          id="ref"
          {...register("ref")}
          maxLength={15}
          placeholder="Optional reference"
        />
        {errors.ref && (
          <p className="text-xs text-destructive">{errors.ref.message}</p>
        )}
      </div>

      <Separator />

      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {partyCode ? "Update" : "Create"} Party Master
      </Button>
    </form>
  );
}
