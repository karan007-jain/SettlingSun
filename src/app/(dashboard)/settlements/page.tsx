"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/trpc";
import { format } from "date-fns";

export default function SettlementsPage() {
  const { data: settlements, isLoading, refetch } = api.settlement.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settlements...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage settlement sessions and DBF output files
          </p>
        </div>
        <Link
          href="/settlements/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          + New Settlement
        </Link>
      </div>

      {!settlements || settlements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 text-lg font-medium mb-2">
            No settlements yet
          </p>
          <p className="text-gray-400 text-sm mb-4">
            Create your first settlement to start processing bank statements
          </p>
          <Link
            href="/settlements/new"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm inline-block"
          >
            Create Settlement
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {settlements.map((s) => (
            <Link
              key={s.id}
              href={`/settlements/${s.settleId}`}
              className="block bg-white border rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {s.settleId}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(s.createdAt), "dd MMM yyyy, HH:mm")}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    s.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {s.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  <span className="font-semibold text-gray-900">
                    {s._count.uploads}
                  </span>{" "}
                  uploads
                </span>
                <span>
                  <span className="font-semibold text-gray-900">
                    {s.uploads.filter((u) => u.status === "processed").length}
                  </span>{" "}
                  processed
                </span>
              </div>

              {s.uploads.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-400 mb-1">Recent uploads</p>
                  <div className="space-y-1">
                    {s.uploads.slice(0, 2).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-600 truncate max-w-[160px]">
                          {u.upline} / {u.filename}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            u.status === "processed"
                              ? "bg-green-100 text-green-700"
                              : u.status === "error"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {u.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
