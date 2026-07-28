"use client";

import { UserCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DriversPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Drivers" description="Manage driver profiles, licenses, and assignments.">
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Driver
        </Button>
      </PageHeader>
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={UserCheck}
            title="No drivers registered"
            description="Register drivers to assign them to vehicles and track their ride history and performance."
            actionLabel="Register Driver"
          />
        </CardContent>
      </Card>
    </div>
  );
}


