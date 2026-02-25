"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowUpDown, IdCard, Users, BarChart3, ArrowRight, FileText } from "lucide-react";

const quickLinks = [
  { href: "/settlements", label: "Settlements", description: "Process & manage settlements", icon: FileText, color: "text-sky-500" },
  { href: "/dashboard/party-master", label: "Party Master", description: "Manage parties & codes", icon: Building2, color: "text-blue-500" },
  { href: "/dashboard/exch", label: "Exchange", description: "Rates & commissions", icon: ArrowUpDown, color: "text-green-500" },
  { href: "/dashboard/id-master", label: "ID Master", description: "User IDs & uplines", icon: IdCard, color: "text-purple-500" },
  { href: "/dashboard/reports/exchange", label: "Exchange Report", description: "Drill-down by exchange", icon: BarChart3, color: "text-orange-500" },
];

function StatCard({ title, count, loading, icon: Icon, color }: {
  title: string; count: number | undefined; loading: boolean; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold">{count ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const { data: partyData, isLoading: partyLoading } = api.partyMaster.getList.useQuery({ page: 1, pageSize: 1 });
  const { data: exchData, isLoading: exchLoading } = api.exch.getList.useQuery({ page: 1, pageSize: 1 });
  const { data: idData, isLoading: idLoading } = api.idMaster.getList.useQuery({ page: 1, pageSize: 1 });
  const { data: settlements = [], isLoading: settlementsLoading } = api.settlement.list.useQuery();
  const { data: users = [], isLoading: usersLoading } = isAdmin ? api.user.getAll.useQuery() : { data: [], isLoading: false };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="text-muted-foreground mt-1 flex items-center flex-wrap gap-1.5">
          Welcome back,{" "}
          <span className="font-medium text-foreground">{session?.user?.email}</span>
          <Badge variant="secondary" className="text-xs">{session?.user?.role}</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Settlements" count={(settlements as any[]).length} loading={settlementsLoading} icon={FileText} color="text-sky-500" />
        <StatCard title="Parties" count={partyData?.total} loading={partyLoading} icon={Building2} color="text-blue-500" />
        <StatCard title="Exchanges" count={exchData?.total} loading={exchLoading} icon={ArrowUpDown} color="text-green-500" />
        <StatCard title="ID Masters" count={idData?.total} loading={idLoading} icon={IdCard} color="text-purple-500" />
        {isAdmin && (
          <StatCard title="Users" count={(users as any[]).length} loading={usersLoading} icon={Users} color="text-orange-500" />
        )}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickLinks.map(({ href, label, description, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

