"use client";

import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Welcome back!</h2>
        <p className="text-gray-600">
          You are logged in as <strong>{session?.user?.email}</strong> with role{" "}
          <strong>{session?.user?.role}</strong>
        </p>
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded">
            <h3 className="font-semibold text-blue-900">Party Master</h3>
            <p className="text-sm text-blue-700">
              Manage party information and codes
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-semibold text-green-900">Exchange</h3>
            <p className="text-sm text-green-700">
              Manage exchange rates and commissions
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded">
            <h3 className="font-semibold text-purple-900">ID Master</h3>
            <p className="text-sm text-purple-700">
              Manage user IDs and upline relationships
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
