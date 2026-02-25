"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc";

interface AddUserModalProps {
  userid: string;
  upline: string;
  /** idCode (Exch.idName) already known from the upload file — no need to ask */
  idCode: string;
  onSave: () => void;
  onCancel: () => void;
}

function renderTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

export function AddUserModal({ userid, upline, idCode, onSave, onCancel }: AddUserModalProps) {
  const [partyCode, setPartyCode] = useState("");
  const [rate, setRate] = useState(0);
  const [commission, setCommission] = useState(0);
  const [partner, setPartner] = useState("");
  const [pati, setPati] = useState(0);
  const [isAmount, setIsAmount] = useState(false);

  const [partySearch, setPartySearch] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [error, setError] = useState("");

  // Effective userid: append * for Amount mode (only if not already ending with *)
  const effectiveUserid = isAmount && !userid.endsWith("*") ? userid + "*" : userid;

  // After save — show generated text
  const [savedText, setSavedText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: parties } = api.config.getPartyMaster.useQuery({ search: partySearch });
  const { data: item } = api.config.getItemByIdName.useQuery(
    { idName: idCode },
    { enabled: !!idCode }
  );

  // Auto-fill RATE and COMMISSION from the item defined by the upload's idCode
  useEffect(() => {
    if (item) {
      setRate(Number(item.rate));
      setCommission(Number(item.idComm));
    }
  }, [item]);

  const addUserMutation = api.process.addUser.useMutation({
    onSuccess: () => {
      const template = (item as any)?.template as string | null | undefined;
      if (template?.trim()) {
        const text = renderTemplate(template, {
          userid: effectiveUserid,
          upline,
          partyCode,
          idCode,
          rate,
          commission,
          pati,
        });
        setSavedText(text);
        // Auto-copy to clipboard
        navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {});
      } else {
        onSave();
      }
    },
    onError: (err) => { setError(err.message); },
  });

  const handleSave = () => {
    setError("");
    if (!partyCode) { setError("PCODE is required"); return; }
    if (!idCode) { setError("Exchange (IDNAME) not available — cannot add user"); return; }
    addUserMutation.mutate({ userid: effectiveUserid, upline, partyCode, idCode, rate, commission, partner, pati });
  };

  const handleCopy = () => {
    if (!savedText) return;
    navigator.clipboard.writeText(savedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Post-save: generated text view ──────────────────────────────────────────
  if (savedText !== null) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-600 text-xl">✅</span>
              <h2 className="text-lg font-bold text-gray-900">User Added</h2>
            </div>
            <p className="text-sm text-gray-500">
              <span className="font-mono font-semibold text-blue-600">{userid}</span> created.
              {copied && <span className="ml-2 text-green-600 font-medium">Copied to clipboard!</span>}
            </p>
          </div>

          <div className="bg-gray-50 border rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Generated Message</span>
              <button
                onClick={handleCopy}
                className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 font-medium"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <pre className="text-sm font-mono whitespace-pre-wrap break-words text-gray-800 leading-relaxed">
              {savedText}
            </pre>
          </div>

          <button
            onClick={onSave}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Form view ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Adding{" "}
                <span className="font-mono font-semibold text-blue-600">{effectiveUserid}</span>
                {" "}to upline{" "}
                <span className="font-mono font-semibold">{upline}</span>
              </p>
            </div>
            {/* Point / Amount toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsAmount(false)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  !isAmount ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Point
              </button>
              <button
                type="button"
                onClick={() => setIsAmount(true)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  isAmount ? "bg-white shadow text-amber-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Amount
              </button>
            </div>
          </div>
          {isAmount && (
            <p className="text-xs text-amber-600 mt-1">
              Amount mode: <span className="font-mono font-bold">{effectiveUserid}</span> will be saved (with *)
            </p>
          )}
        </div>

        <div className="space-y-3">
          {/* Exchange — read-only, derived from the upload file */}
          <div className="bg-gray-50 border rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Exchange (IDNAME)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-gray-800 text-sm">{idCode || "—"}</span>
              {(item as any)?.currency && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  (item as any).currency === "RUPEE"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {(item as any).currency}
                </span>
              )}
            </div>
          </div>

          {/* PCODE */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              PCODE <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={partySearch || partyCode}
              onChange={(e) => { setPartySearch(e.target.value); setPartyCode(""); }}
              placeholder="Search party code..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {partySearch && parties && parties.length > 0 && !partyCode && (
              <div className="border rounded-lg mt-1 max-h-32 overflow-y-auto shadow-sm">
                {parties.map((p) => (
                  <button
                    key={p.partyCode}
                    onClick={() => { setPartyCode(p.partyCode); setPartySearch(p.partyCode); }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex justify-between"
                  >
                    <span className="font-mono font-semibold">{p.partyCode}</span>
                    <span className="text-gray-400">{p.partyName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RATE & COMMISSION — auto-filled from idCode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RATE</label>
              <input
                type="number" step="0.01" value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">COMMISSION</label>
              <input
                type="number" step="0.01" value={commission}
                onChange={(e) => setCommission(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* PARTNER */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">PARTNER (optional)</label>
            <input
              type="text"
              value={partnerSearch || partner}
              onChange={(e) => { setPartnerSearch(e.target.value); setPartner(""); }}
              placeholder="Search partner party..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {partnerSearch && parties && parties.length > 0 && !partner && (
              <div className="border rounded-lg mt-1 max-h-28 overflow-y-auto shadow-sm">
                {parties
                  .filter((p) => p.partyCode.toLowerCase().includes(partnerSearch.toLowerCase()))
                  .map((p) => (
                    <button
                      key={p.partyCode}
                      onClick={() => { setPartner(p.partyCode); setPartnerSearch(p.partyCode); }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex justify-between"
                    >
                      <span className="font-mono font-semibold">{p.partyCode}</span>
                      <span className="text-gray-400">{p.partyName}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* PATI */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">PATI</label>
            <input
              type="number" step="0.01" value={pati}
              onChange={(e) => setPati(parseFloat(e.target.value) || 0)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Template preview */}
          {(item as any)?.template && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-blue-600 mb-1">Message will be generated on save</p>
              <p className="text-xs text-gray-500 font-mono leading-relaxed">
                {(item as any).template}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={addUserMutation.isPending}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
          >
            {addUserMutation.isPending ? "Saving..." : "Save User"}
          </button>
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}
