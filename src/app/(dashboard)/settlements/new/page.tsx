"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";

export default function NewSettlementPage() {
  const [settleId, setSettleId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const createMutation = api.settlement.create.useMutation({
    onSuccess: (data) => {
      router.push(`/settlements/${data.settleId}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const id = settleId.trim().toUpperCase();
    if (!id) {
      setError("Settlement ID is required");
      return;
    }
    if (!/^SETL\d+$/i.test(id)) {
      setError('Settlement ID must be in format SETL followed by a number (e.g. SETL78)');
      return;
    }
    createMutation.mutate({ settleId: id });
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Settlement</h1>
        <p className="text-gray-500 text-sm mt-1">
          Create a new settlement session. A DBF output file will be created at{" "}
          <code className="bg-gray-100 px-1 rounded text-xs">
            data/settlements/{"{SETL_ID}"}/SETL{"{NUM}"}.DBF
          </code>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Settlement ID
          </label>
          <input
            type="text"
            value={settleId}
            onChange={(e) => setSettleId(e.target.value.toUpperCase())}
            placeholder="e.g. SETL78"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">
            Format: SETL followed by a number (e.g. SETL78, SETL123)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Settlement"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
