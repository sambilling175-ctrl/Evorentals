"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OperationsRecord } from "@/data/operations";

interface Metric {
  title: string;
  value: string;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  icon: LucideIcon;
  color: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
  trend: number[];
}

interface OperationsPageProps {
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  metrics: Metric[];
  records: OperationsRecord[];
  listTitle: string;
  insightTitle: string;
  insights: Array<{ label: string; value: string; note: string; color: string }>;
  tabs: string[];
}

export function OperationsPage({
  title,
  description,
  actionLabel,
  actionHref = "#",
  metrics,
  records,
  listTitle,
  insightTitle,
  insights,
  tabs,
}: OperationsPageProps) {
  const [query, setQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState(tabs[0]);
  const filtered = records.filter((record) =>
    `${record.id} ${record.primary} ${record.secondary} ${record.context}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description}>
        <Button asChild className="gap-2">
          <Link href={actionHref}>
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <KPICard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            changeType={metric.changeType}
            icon={metric.icon}
            color={metric.color}
            sparklineData={metric.trend}
            index={index}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4 border-b bg-card/70 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base">{listTitle}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-56 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search ID, customer or vehicle…"
                    className="h-9 pl-9"
                    aria-label={`Search ${listTitle}`}
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" /> Export
                </Button>
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label={`${title} views`}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((record) => (
                <div
                  key={record.id}
                  className="group grid gap-3 p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[110px_minmax(0,1fr)_auto_auto] sm:items-center"
                >
                  <span className="font-mono text-xs font-semibold text-primary">{record.id}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{record.primary}</p>
                    <p className="truncate text-xs text-muted-foreground">{record.secondary}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground/80">{record.context}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {record.amount && <span className="whitespace-nowrap text-sm font-semibold">{record.amount}</span>}
                    <StatusBadge status={record.status} />
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${record.id}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No records match “{query}”.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b p-4">
            <CardTitle className="text-base">{insightTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-3">
            {insights.map((insight) => (
              <button
                key={insight.label}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className={`h-9 w-1 rounded-full ${insight.color}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{insight.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{insight.note}</span>
                </span>
                <span className="text-sm font-bold">{insight.value}</span>
              </button>
            ))}
            <Button variant="ghost" className="mt-2 w-full justify-between text-primary">
              View full report <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
