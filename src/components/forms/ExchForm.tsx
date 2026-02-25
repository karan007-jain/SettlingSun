"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteInput } from "./AutocompleteInput";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

const exchSchema = z.object({
  idName: z.string()
    .max(15, "ID Name must be at most 15 characters")
    .regex(/^[A-Z0-9]+$/i, "ID Name must be alphanumeric (A-Z, 0-9)"),
  partyCode: z.string().length(6, "Party Code is required"),
  shortCode: z.string().max(8, "Short Code must be at most 8 characters"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  idComm: z.coerce.number().min(0, "ID Comm must be positive"),
  idAc: z.string().length(6, "ID Ac is required"),
  currency: z.enum(["PAISA", "RUPEE"]).default("PAISA"),
  template: z.string().optional(),
});

type ExchFormData = z.infer<typeof exchSchema>;

interface ExchFormProps {
  defaultValues?: Partial<ExchFormData>;
  id?: string;
  onSuccess?: () => void;
}

export function ExchForm({ defaultValues, id, onSuccess }: ExchFormProps) {
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: parties = [] } = api.partyMaster.getAll.useQuery();

  const partyOptions = parties.map((party: any) => ({
    value: party.partyCode,
    label: `${party.partyCode} - ${party.partyName}`,
  }));

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ExchFormData>({
    resolver: zodResolver(exchSchema),
    defaultValues,
  });

  const createMutation = api.exch.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Exchange created successfully",
      });
      reset();
      utils.exch.getAll.invalidate();
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

  const updateMutation = api.exch.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Exchange updated successfully",
      });
      utils.exch.getAll.invalidate();
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

  const onSubmit = (data: ExchFormData) => {
    if (id) {
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="idName">ID Name</Label>
        <Input
          id="idName"
          {...register("idName")}
          maxLength={15}
          placeholder="Alphanumeric only (A-Z, 0-9)"
          pattern="[A-Za-z0-9]+"
        />
        {errors.idName && (
          <p className="text-sm text-destructive mt-1">{errors.idName.message}</p>
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
        <Label htmlFor="shortCode">Short Code</Label>
        <Input
          id="shortCode"
          {...register("shortCode")}
          maxLength={8}
          placeholder="Max 8 characters"
        />
        {errors.shortCode && (
          <p className="text-sm text-destructive mt-1">{errors.shortCode.message}</p>
        )}
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
          <Label htmlFor="idComm">ID Comm</Label>
          <Input
            id="idComm"
            type="number"
            step="0.01"
            {...register("idComm")}
            placeholder="0.00"
          />
          {errors.idComm && (
            <p className="text-sm text-destructive mt-1">{errors.idComm.message}</p>
          )}
        </div>
      </div>

      <div>
        <Controller
          name="idAc"
          control={control}
          render={({ field }) => (
            <AutocompleteInput
              label="ID Ac"
              options={partyOptions}
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Select party..."
              error={errors.idAc?.message}
            />
          )}
        />
      </div>

      {/* Currency */}
      <div>
        <Label>Currency</Label>
        <p className="text-xs text-gray-500 mb-1.5">
          RUPEE: rate × 100 applied in calculations (1 rupee = 100 paisa)
        </p>
        <div className="flex gap-4">
          {(["PAISA", "RUPEE"] as const).map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={c}
                {...register("currency")}
                className="accent-blue-600"
              />
              <span className="text-sm font-medium">{c}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Template */}
      <div>
        <Label htmlFor="template">Message Template (optional)</Label>
        <p className="text-xs text-gray-400 mb-1">
          Variables: <span className="font-mono">{`{userid} {upline} {partyCode} {idCode} {rate} {commission} {pati}`}</span>
        </p>
        <textarea
          id="template"
          {...register("template")}
          rows={4}
          placeholder={`Welcome {userid}!\nExchange: {idCode}\nRate: {rate}\nUpline: {upline}`}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono resize-y"
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {id ? "Update" : "Create"} Exchange
      </Button>
    </form>
  );
}
