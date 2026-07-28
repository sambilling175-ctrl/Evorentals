import Link from "next/link";
import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FoundationItem {
  title: string;
  description: string;
  icon: LucideIcon;
  status?: string;
}

interface ModuleFoundationProps {
  title: string;
  description: string;
  eyebrow: string;
  items: FoundationItem[];
  actionLabel: string;
  actionHref?: string;
}

export function ModuleFoundation({
  title,
  description,
  eyebrow,
  items,
  actionLabel,
  actionHref = "#",
}: ModuleFoundationProps) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description}>
        <Button asChild>
          <Link href={actionHref}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/8 via-card to-card">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-2">{eyebrow}</Badge>
            <p className="max-w-2xl text-sm text-muted-foreground">
              The module structure is ready for live data. Business actions will activate as their secured services are connected.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            UI foundation ready
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ title: itemTitle, description: itemDescription, icon: Icon, status }) => (
          <Card key={itemTitle} className="card-hover">
            <CardHeader className="flex-row items-start justify-between space-y-0 p-5 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <Badge variant="outline">{status ?? "Foundation"}</Badge>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <CardTitle className="mb-2 text-base">{itemTitle}</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">{itemDescription}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
