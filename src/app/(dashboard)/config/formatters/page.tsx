"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { ALL_FORMATTER_NAMES, type FormatterName } from "@/lib/formatters";

export default function FormattersConfigPage() {
  const [newFilecode, setNewFilecode] = useState("");
  const [newFormatter, setNewFormatter] = useState<FormatterName>("formattype1");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const utils = api.useUtils();
  const { data: mappings, isLoading } = api.config.getMappings.useQuery();

  const saveMutation = api.config.saveMapping.useMutation({
    onSuccess: () => {
      setNewFilecode("");
      setNewFormatter("formattype1");
      utils.config.getMappings.invalidate();
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = api.config.deleteMapping.useMutation({
    onSuccess: () => utils.config.getMappings.invalidate(),
  });

  const handleSave = () => {
    setError("");
    if (!newFilecode.trim()) { setError("Filecode is required"); return; }
    saveMutation.mutate({ filecode: newFilecode.trim(), formatter: newFormatter });
  };

  const filtered = (mappings ?? []).filter((m) =>
    m.filecode.toLowerCase().includes(search.toLowerCase()) ||
    m.formatter.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Format Config</h1>
        <p className="text-gray-500 text-sm mt-1">
          Map upline codes (filecodes) to their formatter type. Used for auto-detection during processing.
        </p>
      </div>

      {/* Add new mapping */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Add / Update Mapping</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Filecode (upline code)</label>
            <input
              type="text"
              value={newFilecode}
              onChange={(e) => setNewFilecode(e.target.value)}
              placeholder="e.g. JAMES10"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Formatter</label>
            <select
              value={newFormatter}
              onChange={(e) => setNewFormatter(e.target.value as FormatterName)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {ALL_FORMATTER_NAMES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Mappings list */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            All Mappings {mappings && `(${mappings.length})`}
          </h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-48"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No mappings found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-5 py-2 text-left text-xs text-gray-500 font-medium">Filecode</th>
                <th className="px-5 py-2 text-left text-xs text-gray-500 font-medium">Formatter</th>
                <th className="px-5 py-2 text-right text-xs text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-mono font-semibold text-gray-800">{m.filecode}</td>
                  <td className="px-5 py-2.5">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">
                      {m.formatter}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => {
                        setNewFilecode(m.filecode);
                        setNewFormatter(m.formatter as FormatterName);
                      }}
                      className="text-blue-600 hover:underline text-xs mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete mapping for ${m.filecode}?`)) {
                          deleteMutation.mutate({ id: m.id });
                        }
                      }}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
