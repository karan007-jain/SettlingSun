"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SidebarContent } from "@/components/Sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b bg-background/95" />
        <div className="flex">
          <aside className="hidden md:flex w-64 border-r min-h-[calc(100vh-3.5rem)] flex-col p-4 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </aside>
          <main className="flex-1 p-6 md:p-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </main>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      {/* Mobile — Sheet drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="px-4 h-14 flex justify-center border-b">
            <SheetTitle className="text-lg font-bold">SettlingSun</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 border-r bg-background min-h-[calc(100vh-3.5rem)] flex-col shrink-0">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

