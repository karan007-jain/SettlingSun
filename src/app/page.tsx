"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, BarChart3, Users, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Party & Exchange Masters",
    description: "Manage parties, exchanges, and ID master records with full CRUD operations.",
  },
  {
    icon: BarChart3,
    title: "Detailed Reports",
    description: "Exchange-wise and party-wise drill-down reports with real-time search.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Admin, Manager, and User roles with fine-grained permissions.",
  },
];

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-4 w-36 mx-auto" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Settling<span className="text-primary">Sun</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            A complete management system for parties, exchanges, and settlements — with role-based access and real-time reporting.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Create Account
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl px-2">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="text-left">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t">
        © {new Date().getFullYear()} SettlingSun Management System
      </footer>
    </div>
  );
}
