"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  Repeat2,
  BarChart3,
  UserCog,
  FileText,
  FilePlus,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  indent?: boolean;
}

interface NavSection {
  title: string | null;
  adminOnly?: boolean;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Settlements",
    items: [
      { href: "/settlements", label: "All Settlements", icon: FileText },
      { href: "/settlements/new", label: "New Settlement", icon: FilePlus },
    ],
  },
  {
    title: "Masters",
    items: [
      { href: "/dashboard/party-master", label: "Party Master", icon: Building2 },
      { href: "/dashboard/exch", label: "Exchange", icon: ArrowLeftRight },
      { href: "/dashboard/id-master", label: "ID Master", icon: Repeat2 },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/dashboard/reports/exchange", label: "Exchange-wise", icon: BarChart3 },
      { href: "/dashboard/reports/party", label: "Party-wise", icon: BarChart3 },
    ],
  },
  {
    title: "Admin",
    adminOnly: true,
    items: [
      { href: "/dashboard/users", label: "User Management", icon: UserCog, adminOnly: true },
    ],
  },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/settlements") return pathname === "/settlements";
    if (href === "/settlements/new") return pathname === "/settlements/new";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full py-4">
      <nav className="flex-1 px-3 space-y-1">
        {navSections.map((section, si) => {
          if (section.adminOnly && !isAdmin) return null;
          const visibleItems = section.items.filter((item) =>
            item.adminOnly ? isAdmin : true
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={si}>
              {si > 0 && <Separator className="my-3" />}
              {section.title && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {section.title}
                </p>
              )}
              {visibleItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
