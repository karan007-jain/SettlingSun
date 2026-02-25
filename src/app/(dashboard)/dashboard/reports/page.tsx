"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Building2 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-gray-600 mt-1">Select a report to view detailed analytics</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/dashboard/reports/exchange">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">Exchange-wise Report</CardTitle>
                  <CardDescription className="mt-2">
                    View exchanges, uplines, and their downlines hierarchy
                  </CardDescription>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Browse all exchanges with search and pagination</li>
                <li>• Select exchanges to view uplines</li>
                <li>• Drill down to view downlines for each upline</li>
                <li>• Multi-select filters for flexible analysis</li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/reports/party">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">Party-wise Report</CardTitle>
                  <CardDescription className="mt-2">
                    View parties and their associated ID masters
                  </CardDescription>
                </div>
                <Building2 className="h-8 w-8 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Browse all parties with search and pagination</li>
                <li>• Select parties to view ID masters</li>
                <li>• View detailed information for each ID master</li>
                <li>• Multi-select filters for comparison</li>
              </ul>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
