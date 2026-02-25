"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AutocompleteInput } from "./AutocompleteInput";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Copy, Check, ClipboardCheck } from "lucide-react";

function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    ok ? resolve() : reject(new Error("execCommand copy failed"));
  });
}

const idMasterSchema = z.object({
  userId: z.string()
    .max(15, "User ID must be at most 15 characters")
    .regex(/^[A-Z0-9.*]+$/i, "User ID must be alphanumeric and can contain . and *"),
  partyCode: z.string().min(1, "Party Code is required").max(6),
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
  const [isAmount, setIsAmount] = useState(
    () => !!defaultValues?.userId?.endsWith("*")
  );

  // Template copy state
  const [savedText, setSavedText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Store last submitted data for template rendering

  // Per-field search state — lean server-filtered queries instead of getAll/getAll(with joins).
  // Seeded from defaultValues so edit mode pre-fetches the saved record even if it
  // falls outside the first page of results.
  const [partySearch, setPartySearch] = useState(defaultValues?.partyCode ?? "");
  const [exchSearch, setExchSearch] = useState(defaultValues?.idCode ?? "");
  const [partnerSearch, setPartnerSearch] = useState(defaultValues?.partner ?? "");
  const [uplineSearch, setUplineSearch] = useState(defaultValues?.uplineId ?? "");
  const { data: partyOptions = [], isFetching: partyLoading } =
    api.partyMaster.listOptions.useQuery({ search: partySearch });
  const { data: exchOptions = [], isFetching: exchLoading } =
    api.exch.listOptions.useQuery({ search: exchSearch });
  const { data: partnerOptions = [], isFetching: partnerLoading } =
    api.partyMaster.listOptions.useQuery({ search: partnerSearch });
  const { data: uplines = [], isFetching: uplineLoading } =
    api.idMaster.getUplines.useQuery({ search: uplineSearch });

  const uplineOptions = uplines.map((u: any) => ({
    value: u.userId,
    label: u.userId,
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
  const idCodeValue = watch("idCode");

  // Derive currency from the selected exchange — lean single-field query
  const { data: selectedExch } = api.exch.getByIdName.useQuery(
    { idName: idCodeValue ?? "" },
    { enabled: !!idCodeValue }
  );
  const currency: "PAISA" | "RUPEE" = (selectedExch?.currency as "PAISA" | "RUPEE") ?? "PAISA";

  useEffect(() => {
    setShowUplineId(!isUplineValue);
  }, [isUplineValue]);

  const createMutation = api.idMaster.create.useMutation({
    onSuccess: (data) => {
      utils.idMaster.getAll.invalidate();
      utils.idMaster.getUplines.invalidate();

      // Check if the selected exchange has a template
      const submitted = data;

      if (submitted.exch.template?.trim() && submitted) {
        const text = renderTemplate(submitted.exch.template, {
          userid: submitted.userId.replace(/[.*]/g, ""),
          upline: submitted.uplineId ?? "",
          partyCode: submitted.partyCode,
          idCode: submitted.idCode,
          rate: submitted.exch.currency === "RUPEE" ?  Number(submitted.rate) /100 : Number(submitted.rate),
          commission: Number(submitted.comm),
          pati: Number(submitted.pati) ?? 0,
        });
        setSavedText(text);
        copyToClipboard(text).then(() => setCopied(true)).catch(() => {});
      } else {
        toast({ title: "Success", description: "ID Master created successfully" });
        reset();
        onSuccess?.();
      }
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
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
    // Multiply rate/comm by 100 for RUPEE exchanges (store in paisa units)
    const rateVal = currency === "RUPEE" ? data.rate * 100 : data.rate;
   
    const submitData = {
      ...data,
      userId,
      rate: rateVal,
      uplineId: data.isUpline ? null : data.uplineId,
    };

    if (id) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  // ── Post-save: generated template view ───────────────────────────────────
  if (savedText !== null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-green-600" />
          <h3 className="text-base font-semibold">ID Master Created</h3>
          {copied && <Badge variant="secondary" className="text-green-600">Copied!</Badge>}
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Generated Message</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                copyToClipboard(savedText).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }).catch(() => {});
              }}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre data-copy-idmaster className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
            {savedText}
          </pre>
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            setSavedText(null);
            setCopied(false);
            reset();
            onSuccess?.();
          }}
        >
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* User ID */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="userId">User ID</Label>
          {!id && (
            <RadioGroup
              value={isAmount ? "amount" : "point"}
              onValueChange={(v) => setIsAmount(v === "amount")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="point" id="mode-point" />
                <Label htmlFor="mode-point" className="cursor-pointer text-xs font-semibold text-primary">Point</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="amount" id="mode-amount" />
                <Label htmlFor="mode-amount" className="cursor-pointer text-xs font-semibold text-amber-600">Amount</Label>
              </div>
            </RadioGroup>
          )}
        </div>
        <Input
          id="userId"
          {...register("userId")}
          disabled={!!id}
          maxLength={isAmount ? 14 : 15}
          placeholder={isAmount ? "Will save with * appended" : "A-Z, 0-9, . and * allowed"}
          className="font-mono"
        />
        {isAmount && !id && (
          <p className="text-xs text-amber-600">Amount mode: <span className="font-mono">*</span> will be appended on save</p>
        )}
        {errors.userId && <p className="text-xs text-destructive">{errors.userId.message}</p>}
      </div>

      {/* Party + Exchange */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="partyCode"
          control={control}
          render={({ field }) => (
            <AutocompleteInput
              label="Party Code"
              options={partyOptions}
              value={field.value || ""}
              onChange={field.onChange}
              onSearch={setPartySearch}
              isLoading={partyLoading}
              placeholder="Select party..."
              error={errors.partyCode?.message}
            />
          )}
        />
        <Controller
          name="idCode"
          control={control}
          render={({ field }) => (
            <AutocompleteInput
              label="ID Code (Exchange)"
              options={exchOptions}
              value={field.value || ""}
              onChange={field.onChange}
              onSearch={setExchSearch}
              isLoading={exchLoading}
              placeholder="Select exchange..."
              error={errors.idCode?.message}
            />
          )}
        />
      </div>

      {/* Credit + Comm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="credit">Credit Limit</Label>
          <Input id="credit" type="number" step="0.01" {...register("credit")} placeholder="0.00" />
          {errors.credit && <p className="text-xs text-destructive">{errors.credit.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="comm">Commission</Label>
          <Input id="comm" type="number" step="0.01" {...register("comm")} placeholder="0.00" />
          {errors.comm && <p className="text-xs text-destructive">{errors.comm.message}</p>}
        </div>
      </div>

      {/* Rate + Pati */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="rate">Rate</Label>
            {currency === "RUPEE" && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs py-0">
                RUPEE
              </Badge>
            )}
          </div>
          <Input id="rate" type="number" step="0.01" {...register("rate")} placeholder="0.00" />
          {errors.rate && <p className="text-xs text-destructive">{errors.rate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pati">Pati <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="pati" type="number" step="0.01" {...register("pati")} placeholder="Optional" />
          {errors.pati && <p className="text-xs text-destructive">{errors.pati.message}</p>}
        </div>
      </div>

      {/* Partner */}
      <Controller
        name="partner"
        control={control}
        render={({ field }) => (
          <AutocompleteInput
            label="Partner Party (optional)"
            options={partnerOptions}
            value={field.value || ""}
            onChange={field.onChange}
            onSearch={setPartnerSearch}
            isLoading={partnerLoading}
            placeholder="Select partner party..."
            error={errors.partner?.message}
          />
        )}
      />

      {/* Active + Upline flags */}
      <div className="flex flex-wrap gap-6">
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor="active" className="cursor-pointer">Active</Label>
            </div>
          )}
        />
        <Controller
          name="isUpline"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox id="isUpline" checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor="isUpline" className="cursor-pointer">Is Upline</Label>
            </div>
          )}
        />
      </div>

      {/* Upline ID — only when not an upline */}
      {showUplineId && (
        <Controller
          name="uplineId"
          control={control}
          render={({ field }) => (
            <AutocompleteInput
              label="Upline ID"
              options={uplineOptions}
              value={field.value || ""}
              onChange={field.onChange}
              onSearch={setUplineSearch}
              isLoading={uplineLoading}
              placeholder="Select upline..."
              error={errors.uplineId?.message}
            />
          )}
        />
      )}

      <Separator />

      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {id ? "Update" : "Create"} ID Master
      </Button>
    </form>
  );
}
