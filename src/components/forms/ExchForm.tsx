"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AutocompleteInput } from "./AutocompleteInput";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

const exchSchema = z.object({
  idName: z.string()
    .max(15, "ID Name must be at most 15 characters")
    .regex(/^[A-Z0-9]+$/i, "ID Name must be alphanumeric (A-Z, 0-9)"),
  partyCode: z.string().min(1, "Party Code is required").max(6),
  shortCode: z.string().max(8, "Short Code must be at most 8 characters"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  idComm: z.coerce.number().min(0, "ID Comm must be positive"),
  idAc: z.string().min(1, "ID Ac is required").max(6),
  currency: z.enum(["PAISA", "RUPEE"]).default("PAISA"),
  template: z.string().optional(),
  template2: z.string().optional(),
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

  // Per-field search state — lean server-filtered queries instead of getAll.
  // Seeded from defaultValues so edit mode pre-fetches the saved record.
  const [partyCodeSearch, setPartyCodeSearch] = useState(defaultValues?.partyCode ?? "");
  const [idAcSearch, setIdAcSearch] = useState(defaultValues?.idAc ?? "");
  const { data: partyCodeOptions = [], isFetching: partyCodeLoading } =
    api.partyMaster.listOptions.useQuery({ search: partyCodeSearch });
  const { data: idAcOptions = [], isFetching: idAcLoading } =
    api.partyMaster.listOptions.useQuery({ search: idAcSearch });

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Row 1: ID Name + Short Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="idName">
            ID Name <span className="text-muted-foreground text-xs">(max 15)</span>
          </Label>
          <Input
            id="idName"
            {...register("idName")}
            maxLength={15}
            placeholder="Alphanumeric only"
            className="uppercase"
          />
          {errors.idName && (
            <p className="text-xs text-destructive">{errors.idName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="shortCode">
            Short Code <span className="text-muted-foreground text-xs">(max 8)</span>
          </Label>
          <Input
            id="shortCode"
            {...register("shortCode")}
            maxLength={8}
            placeholder="e.g. CRIC01"
            className="font-mono"
          />
          {errors.shortCode && (
            <p className="text-xs text-destructive">{errors.shortCode.message}</p>
          )}
        </div>
      </div>

      {/* Row 2: Party Code */}
      <Controller
        name="partyCode"
        control={control}
        render={({ field }) => (
          <AutocompleteInput
            label="Party Code"
            options={partyCodeOptions}
            value={field.value || ""}
            onChange={field.onChange}
            onSearch={setPartyCodeSearch}
            isLoading={partyCodeLoading}
            placeholder="Select party..."
            error={errors.partyCode?.message}
          />
        )}
      />

      {/* Row 3: Rate + ID Comm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rate">Rate</Label>
          <Input id="rate" type="number" step="0.01" {...register("rate")} placeholder="0.00" />
          {errors.rate && <p className="text-xs text-destructive">{errors.rate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="idComm">ID Comm</Label>
          <Input id="idComm" type="number" step="0.01" {...register("idComm")} placeholder="0.00" />
          {errors.idComm && <p className="text-xs text-destructive">{errors.idComm.message}</p>}
        </div>
      </div>

      {/* Row 4: ID Ac */}
      <Controller
        name="idAc"
        control={control}
        render={({ field }) => (
          <AutocompleteInput
            label="ID Ac (Account Party)"
            options={idAcOptions}
            value={field.value || ""}
            onChange={field.onChange}
            onSearch={setIdAcSearch}
            isLoading={idAcLoading}
            placeholder="Select party..."
            error={errors.idAc?.message}
          />
        )}
      />

      {/* Currency */}
      <div className="space-y-2">
        <Label>Currency</Label>
        <p className="text-xs text-muted-foreground">RUPEE: rate × 100 applied in calculations</p>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="flex gap-6"
            >
              {(["PAISA", "RUPEE"] as const).map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <RadioGroupItem value={c} id={`currency-${c}`} />
                  <Label htmlFor={`currency-${c}`} className="cursor-pointer font-medium">{c}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
      </div>

      <Separator />

      {/* Template */}
      <div className="space-y-2">
        <Label htmlFor="template">Message Template <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <p className="text-xs text-muted-foreground font-mono">
          {`{userid} {upline} {partyCode} {idCode} {rate} {commission} {pati}`}
        </p>
        <Textarea
          id="template"
          {...register("template")}
          rows={4}
          placeholder={`Welcome {userid}!\nExchange: {idCode}\nRate: {rate}\nUpline: {upline}`}
          className="font-mono resize-y text-sm"
        />
      </div>

      {/* Template 2 */}
      <div className="space-y-2">
        <Label htmlFor="template2">Message Template 2 <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <p className="text-xs text-muted-foreground font-mono">
          {`{userid} {upline} {partyCode} {idCode} {rate} {commission} {pati}`}
        </p>
        <Textarea
          id="template2"
          {...register("template2")}
          rows={4}
          placeholder={`Backup message for {userid}\nExchange: {idCode}\nRate: {rate}`}
          className="font-mono resize-y text-sm"
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {id ? "Update" : "Create"} Exchange
      </Button>
    </form>
  );
}
