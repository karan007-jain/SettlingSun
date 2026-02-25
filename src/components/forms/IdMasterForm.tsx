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
import { useState, useEffect, useRef } from "react";

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

  const { data: parties = [] } = api.partyMaster.getAll.useQuery();
  const { data: exchanges = [] } = api.exch.getAll.useQuery();
  const { data: uplines = [] } = api.idMaster.getUplines.useQuery();

  const partyOptions = parties.map((party: any) => ({
    value: party.partyCode,
    label: `${party.partyCode} - ${party.partyName}`,
  }));

  const exchOptions = exchanges.map((exch: any) => ({
    value: exch.idName,
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
  const idCodeValue = watch("idCode");

  // Derive currency from the selected exchange
  const selectedExch = (exchanges as any[]).find((e: any) => e.idName === idCodeValue);
  const currency: "PAISA" | "RUPEE" = selectedExch?.currency ?? "PAISA";

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
          <span className="text-green-600 text-xl">✅</span>
          <h3 className="text-base font-bold text-gray-900">ID Master Created</h3>
          {copied && <span className="ml-2 text-green-600 text-sm font-medium">Copied!</span>}
        </div>
        <div className="bg-gray-50 border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Generated Message</span>
            <button
              type="button"
              onClick={() => {
                copyToClipboard(savedText).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }).catch(() => {
                  const pre = document.querySelector("pre[data-copy-idmaster]") as HTMLPreElement | null;
                  if (pre) {
                    const range = document.createRange();
                    range.selectNodeContents(pre);
                    window.getSelection()?.removeAllRanges();
                    window.getSelection()?.addRange(range);
                  }
                });
              }}
              className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 font-medium"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <pre data-copy-idmaster className="text-sm font-mono whitespace-pre-wrap break-words text-gray-800 leading-relaxed">
            {savedText}
          </pre>
        </div>
        <button
          type="button"
          onClick={() => {
            setSavedText(null);
            setCopied(false);
            reset();
            onSuccess?.();
          }}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm"
        >
          Done
        </button>
      </div>
    );
  }

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
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="rate">Rate</Label>
            {currency !== "PAISA" && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">{currency}</span>
            )}
          </div>
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
