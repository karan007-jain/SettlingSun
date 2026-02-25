"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AutocompleteInput } from "./AutocompleteInput";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const idMasterSchema = z.object({
  userId: z.string()
    .max(15, "User ID must be at most 15 characters")
    .regex(/^[A-Z0-9.*]+$/i, "User ID must be alphanumeric and can contain . and *"),
  partyCode: z.string().length(6, "Party Code is required"),
  idCode: z.string().min(1, "ID Code is required"),
  credit: z.coerce.number().min(0, "Credit must be positive").default(0),
  comm: z.coerce.number().min(0, "Comm must be positive"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  pati: z.coerce.number().min(0, "Pati must be positive").optional().nullable(),
  partner: z.string().max(6).optional().nullable(),
  active: z.boolean().default(true),
  isUpline: z.boolean().default(false),
  uplineId: z.string().max(15).optional().nullable(),
});

type IdMasterFormData = z.infer<typeof idMasterSchema>;

interface IdMasterFormProps {
  defaultValues?: Partial<IdMasterFormData>;
  id?: string;
  onSuccess?: () => void;
}

export function IdMasterForm({ defaultValues, id, onSuccess }: IdMasterFormProps) {
  const { toast } = useToast();
  const utils = api.useUtils();
  const [showUplineId, setShowUplineId] = useState(defaultValues?.isUpline || false);
  // Point vs Amount mode — only relevant on create; Amount appends * to userId
  const [isAmount, setIsAmount] = useState(
    () => !!defaultValues?.userId?.endsWith("*")
  );

  const { data: parties = [] } = api.partyMaster.getAll.useQuery();
  const { data: exchanges = [] } = api.exch.getAll.useQuery();
  const { data: uplines = [] } = api.idMaster.getUplines.useQuery();

  const partyOptions = parties.map((party: any) => ({
    value: party.partyCode,
    label: `${party.partyCode} - ${party.partyName}`,
  }));

  const exchOptions = exchanges.map((exch: any) => ({
    value: exch.id,
    label: `${exch.idName} - ${exch.shortCode}`,
  }));

  const uplineOptions = uplines.map((upline: any) => ({
    value: upline.userId,
    label: upline.userId,
  }));

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<IdMasterFormData>({
    resolver: zodResolver(idMasterSchema),
    defaultValues: {
      active: true,
      isUpline: false,
      ...defaultValues,
    },
  });

  const isUplineValue = watch("isUpline");

  useEffect(() => {
    setShowUplineId(!isUplineValue);
  }, [isUplineValue]);

  const createMutation = api.idMaster.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "ID Master created successfully",
      });
      reset();
      utils.idMaster.getAll.invalidate();
      utils.idMaster.getUplines.invalidate();
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

  const updateMutation = api.idMaster.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "ID Master updated successfully",
      });
      utils.idMaster.getAll.invalidate();
      utils.idMaster.getUplines.invalidate();
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

  const onSubmit = (data: IdMasterFormData) => {
    // Append * when Amount mode (create only; on edit userId is disabled)
    const userId = !id && isAmount && !data.userId.endsWith("*")
      ? data.userId + "*"
      : data.userId;
    const submitData = {
      ...data,
      userId,
      uplineId: data.isUpline ? null : data.uplineId,
    };

    if (id) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="userId">User ID</Label>
          {/* Point / Amount toggle — create only */}
          {!id && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setIsAmount(false)}
                className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                  !isAmount ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Point
              </button>
              <button
                type="button"
                onClick={() => setIsAmount(true)}
                className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                  isAmount ? "bg-white shadow text-amber-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Amount
              </button>
            </div>
          )}
        </div>
        <Input
          id="userId"
          {...register("userId")}
          disabled={!!id}
          maxLength={isAmount ? 14 : 15}
          placeholder={isAmount ? "A-Z, 0-9, . (will save with *)" : "A-Z, 0-9, . and * allowed"}
          pattern="[A-Za-z0-9.*]+"
        />
        {isAmount && !id && (
          <p className="text-xs text-amber-600 mt-1">Amount mode: <span className="font-mono">*</span> will be appended on save</p>
        )}
        {errors.userId && (
          <p className="text-sm text-destructive mt-1">{errors.userId.message}</p>
        )}
      </div>

      <div>
        <Controller
          name="partyCode"
          control={control}
          render={({ field }) => (
            <AutocompleteInput
              label="Party Code"
              options={partyOptions}
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Select party..."
              error={errors.partyCode?.message}
            />
          )}
        />
      </div>

      <div>
        <Controller
          name="idCode"
          control={control}
          render={({ field }) => (
            <AutocompleteInput
              label="ID Code"
              options={exchOptions}
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Select exchange..."
              error={errors.idCode?.message}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="credit">Credit Limit</Label>
          <Input
            id="credit"
            type="number"
            step="0.01"
            {...register("credit")}
            placeholder="0.00"
          />
          {errors.credit && (
            <p className="text-sm text-destructive mt-1">{errors.credit.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="comm">Commission</Label>
          <Input
            id="comm"
            type="number"
            step="0.01"
            {...register("comm")}
            placeholder="0.00"
          />
          {errors.comm && (
            <p className="text-sm text-destructive mt-1">{errors.comm.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rate">Rate</Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            {...register("rate")}
            placeholder="0.00"
          />
          {errors.rate && (
            <p className="text-sm text-destructive mt-1">{errors.rate.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="pati">Pati (Numeric)</Label>
          <Input
            id="pati"
            type="number"
            step="0.01"
            {...register("pati")}
            placeholder="Optional"
          />
          {errors.pati && (
            <p className="text-sm text-destructive mt-1">{errors.pati.message}</p>
          )}
        </div>
      </div>

      <div>
        <Controller
          name="partner"
          control={control}
          render={({ field }) => (
            <AutocompleteInput
              label="Partner (Party)"
              options={partyOptions}
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Select partner party (optional)..."
              error={errors.partner?.message}
            />
          )}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="active"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Controller
          name="isUpline"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="isUpline"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="isUpline">Is Upline</Label>
      </div>

      {showUplineId && (
        <div>
          <Controller
            name="uplineId"
            control={control}
            render={({ field }) => (
              <AutocompleteInput
                label="Upline ID"
                options={uplineOptions}
                value={field.value || ""}
                onChange={field.onChange}
                placeholder="Select upline..."
                error={errors.uplineId?.message}
              />
            )}
          />
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {id ? "Update" : "Create"} ID Master
      </Button>
    </form>
  );
}
