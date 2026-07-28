"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Bike,
  KeyRound,
  IndianRupee,
  Activity,
  CalendarCheck,
  Users,
  Zap,
  FileText,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ChartContainer } from "@/components/charts/chart-container";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { DataTable } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  revenueData,
  fleetUtilizationData,
  rentalDistribution,
  vehicleSparkline,
  rentalSparkline,
  revenueSparkline,
  utilizationSparkline,
  recentRentals,
  recentActivities,
} from "@/data/mock";

// ─── Rental columns for DataTable ────────────────────────────────
type Rental = (typeof recentRentals)[number];

const rentalColumns: ColumnDef<Rental>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "Rental ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-primary">
        {row.getValue("id")}
      </span>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("customer")}</span>
    ),
  },
  {
    accessorKey: "vehicle",
    header: "Vehicle",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.getValue("vehicle")}</p>
        <p className="text-xs text-muted-foreground">{row.original.vehicleNo}</p>
      </div>
    ),
  },
  {
    accessorKey: "plan",
    header: "Plan",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.getValue("plan")}</Badge>
    ),
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => formatDate(row.getValue("startDate")),
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => formatDate(row.getValue("endDate")),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-semibold">
        {formatCurrency(row.getValue("amount"))}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2 cursor-pointer">
            <Eye className="h-4 w-4" /> View
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 cursor-pointer">
            <Pencil className="h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-destructive cursor-pointer">
            <Trash2 className="h-4 w-4" /> Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

// ─── Quick Actions Config ────────────────────────────────────────
const quickActions = [
  {
    id: "1",
    title: "New Booking",
    description: "Create a rental booking",
    icon: CalendarCheck,
    href: "/bookings",
    color: "blue" as const,
  },
  {
    id: "2",
    title: "Add Customer",
    description: "Register new customer",
    icon: Users,
    href: "/customers",
    color: "green" as const,
  },
  {
    id: "3",
    title: "Add Vehicle",
    description: "Register to fleet",
    icon: Zap,
    href: "/fleet",
    color: "purple" as const,
  },
  {
    id: "4",
    title: "Create Invoice",
    description: "Generate billing",
    icon: FileText,
    href: "/payments",
    color: "orange" as const,
  },
];

// ─── Dashboard Page ──────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back, Arjun. Here's what's happening with your fleet."
      >
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarCheck className="h-4 w-4" />
          Today: Jul 12, 2026
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Vehicles"
          value="248"
          change={12}
          changeType="increase"
          icon={Bike}
          color="blue"
          sparklineData={vehicleSparkline}
          index={0}
        />
        <KPICard
          title="Active Rentals"
          value="186"
          change={8}
          changeType="increase"
          icon={KeyRound}
          color="green"
          sparklineData={rentalSparkline}
          index={1}
        />
        <KPICard
          title="Monthly Revenue"
          value="12.4L"
          change={15}
          changeType="increase"
          icon={IndianRupee}
          color="purple"
          sparklineData={revenueSparkline}
          prefix="₹"
          index={2}
        />
        <KPICard
          title="Fleet Utilization"
          value="74.8"
          change={3}
          changeType="increase"
          icon={Activity}
          color="orange"
          sparklineData={utilizationSparkline}
          suffix="%"
          index={3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <ChartContainer
          title="Revenue Trend"
          subtitle="Monthly revenue vs expenses"
          className="lg:col-span-4"
        >
          <AreaChart
            data={revenueData}
            xKey="month"
            yKeys={["revenue", "expenses"]}
            colors={["#3B82F6", "#8B5CF6"]}
          />
        </ChartContainer>

        <ChartContainer
          title="Fleet Utilization"
          subtitle="By vehicle model"
          className="lg:col-span-3"
        >
          <BarChart
            data={fleetUtilizationData}
            xKey="model"
            yKeys={["utilization"]}
            colors={["#10B981"]}
          />
        </ChartContainer>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Recent Rentals Table */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Recent Rentals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={rentalColumns}
              data={recentRentals}
              searchKey="customer"
              searchPlaceholder="Search by customer..."
            />
          </CardContent>
        </Card>

        {/* Right Panel */}
        <div className="lg:col-span-2 space-y-4">
          <ChartContainer
            title="Rental Plans"
            subtitle="Distribution by type"
            height={200}
          >
            <DonutChart
              data={rentalDistribution}
              centerValue="186"
              centerLabel="Total"
              innerRadius={50}
              outerRadius={80}
            />
          </ChartContainer>

          {/* Legend */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {rentalDistribution.map((item, idx) => {
                  const colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"];
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: colors[idx] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="ml-auto font-semibold">{item.value}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row — Quick Actions + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions actions={quickActions} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={recentActivities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
