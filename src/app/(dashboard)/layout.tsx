"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-57px)] p-4">
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="block px-4 py-2 rounded hover:bg-gray-100 font-medium"
            >
              Dashboard
            </Link>

            <div className="border-t my-2"></div>
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Settlements
            </div>
            <Link
              href="/settlements"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              All Settlements
            </Link>
            <Link
              href="/settlements/new"
              className="block px-4 py-2 rounded hover:bg-gray-100 pl-8 text-sm"
            >
              + New Settlement
            </Link>

            <div className="border-t my-2"></div>
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Masters
            </div>
            <Link
              href="/dashboard/party-master"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Party Master
            </Link>
            <Link
              href="/dashboard/exch"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Exchange (Items)
            </Link>
            <Link
              href="/dashboard/id-master"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              ID Master
            </Link>

            <div className="border-t my-2"></div>
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Config
            </div>
            <Link
              href="/config/formatters"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Format Config
            </Link>

            <div className="border-t my-2"></div>
            <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Reports
            </div>
            <Link
              href="/dashboard/reports/exchange"
              className="block px-4 py-2 rounded hover:bg-gray-100 text-sm"
            >
              Exchange-wise
            </Link>
            <Link
              href="/dashboard/reports/party"
              className="block px-4 py-2 rounded hover:bg-gray-100 text-sm"
            >
              Party-wise
            </Link>
            {session?.user?.role === "ADMIN" && (
              <>
                <div className="border-t my-2"></div>
                <Link
                  href="/dashboard/users"
                  className="block px-4 py-2 rounded hover:bg-gray-100 text-red-600 font-medium text-sm"
                >
                  User Management
                </Link>
              </>
            )}
          </nav>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
