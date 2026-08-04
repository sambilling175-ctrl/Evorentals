"use client";

import { useActionState, useDeferredValue, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarDays, History, Search, ShieldCheck, UserCheck, UserCog, Users } from "lucide-react";
import { updateEmployee, initialEmployeeActionState } from "@/app/(dashboard)/employees/actions";
import type { EmployeeRecord, EmployeeWorkspaceData } from "@/lib/services/employees";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "ER";
}

function roleLabel(role: string) {
  return role.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function EmployeeWorkspace({ data }: { data: EmployeeWorkspaceData }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [status, setStatus] = useState<"all" | "active" | "disabled">("all");
  const employees = data.employees.filter((employee) => {
    const matchesStatus = status === "all" || employee.status === status;
    const haystack = `${employee.fullName} ${employee.email} ${employee.employeeNumber} ${employee.department} ${employee.designation} ${employee.role}`.toLowerCase();
    return matchesStatus && (!deferredQuery || haystack.includes(deferredQuery));
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Employees" value={data.totals.all} tone="blue" />
        <Metric icon={UserCheck} label="Active" value={data.totals.active} tone="emerald" />
        <Metric icon={UserCog} label="Disabled" value={data.totals.disabled} tone="amber" />
        <Metric icon={ShieldCheck} label="Administrators" value={data.totals.administrators} tone="purple" />
      </div>

      <Tabs defaultValue="directory" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <Card className="border-border/80 bg-card/90">
            <CardHeader className="gap-4 border-b border-border/70 lg:flex-row lg:items-center lg:justify-between">
              <div><CardTitle>Employee directory</CardTitle><CardDescription>Existing authenticated employees in your company. Invitations remain disabled until secure SMTP and server credentials are configured.</CardDescription></div>
              <div className="relative w-full lg:w-80"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employees…" aria-label="Search employees" className="pl-9" /></div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex gap-2 overflow-x-auto border-b border-border/70 p-3" aria-label="Employee status filter">
                {(["all", "active", "disabled"] as const).map((value) => <Button key={value} size="sm" variant={status === value ? "default" : "outline"} onClick={() => setStatus(value)} aria-pressed={status === value} className="capitalize">{value}</Button>)}
                <span className="ml-auto self-center text-xs text-muted-foreground">{employees.length} result{employees.length === 1 ? "" : "s"}</span>
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/70 bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Assignment</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-border/60">{employees.map((employee) => <EmployeeRow key={employee.id} employee={employee} data={data} />)}</tbody>
                </table>
              </div>
              <div className="divide-y divide-border/60 md:hidden">{employees.map((employee) => <EmployeeMobileCard key={employee.id} employee={employee} data={data} />)}</div>
              {employees.length === 0 && <p className="px-4 py-12 text-center text-sm text-muted-foreground">No employees match this filter.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid gap-4 lg:grid-cols-3">{data.roles.map((role) => {
            const modules = Object.keys(role.permissions);
            return <Card key={role.name} className="border-border/80 bg-card/90"><CardHeader><div className="flex items-center justify-between"><CardTitle className="capitalize">{roleLabel(role.name)}</CardTitle><Badge variant={role.name === "admin" ? "default" : "secondary"}>{data.employees.filter((employee) => employee.role === role.name).length} assigned</Badge></div><CardDescription>{role.description}</CardDescription></CardHeader><CardContent><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module access</p><div className="flex flex-wrap gap-2">{modules.map((module) => <Badge key={module} variant="outline">{module}</Badge>)}</div>{modules.length === 0 && <p className="text-sm text-muted-foreground">No module permissions configured.</p>}</CardContent></Card>;
          })}</div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-border/80 bg-card/90"><CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Access history</CardTitle><CardDescription>Append-only changes to employee profiles, roles, and account status.</CardDescription></CardHeader><CardContent className="space-y-3">{data.recentEvents.map((event) => <div key={event.id} className="flex gap-3 rounded-xl border border-border/70 bg-muted/15 p-4"><div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><CalendarDays className="h-4 w-4" /></div><div className="min-w-0"><p className="text-sm font-semibold">{event.employeeName}</p><p className="text-sm text-muted-foreground">{event.summary}</p><p className="mt-1 text-xs text-muted-foreground">By {event.actorName} · {dateTimeFormatter.format(new Date(event.occurredAt))}</p></div></div>)}{data.recentEvents.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No employee access changes recorded yet.</p>}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmployeeRow({ employee, data }: { employee: EmployeeRecord; data: EmployeeWorkspaceData }) {
  return <tr className="transition-colors hover:bg-muted/15"><td className="px-4 py-3"><EmployeeIdentity employee={employee} /></td><td className="px-4 py-3"><p className="font-medium">{employee.designation}</p><p className="text-xs text-muted-foreground">{employee.department}{employee.joiningDate ? ` · Since ${dateFormatter.format(new Date(`${employee.joiningDate}T00:00:00+05:30`))}` : ""}</p></td><td className="px-4 py-3"><Badge variant="outline" className="capitalize">{roleLabel(employee.role)}</Badge></td><td className="px-4 py-3"><StatusBadge status={employee.status} /></td><td className="px-4 py-3 text-right">{data.canManage ? <EmployeeEditDialog employee={employee} data={data} /> : <span className="text-xs text-muted-foreground">View only</span>}</td></tr>;
}

function EmployeeMobileCard({ employee, data }: { employee: EmployeeRecord; data: EmployeeWorkspaceData }) {
  return <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><EmployeeIdentity employee={employee} /><StatusBadge status={employee.status} /></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{roleLabel(employee.role)}</Badge><Badge variant="secondary">{employee.department}</Badge></div>{data.canManage && <EmployeeEditDialog employee={employee} data={data} />}</div>;
}

function EmployeeIdentity({ employee }: { employee: EmployeeRecord }) {
  return <div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">{initials(employee.fullName)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-semibold">{employee.fullName}</p><p className="truncate text-xs text-muted-foreground">{employee.employeeNumber} · {employee.email}</p></div></div>;
}

function StatusBadge({ status }: { status: EmployeeRecord["status"] }) {
  return <Badge className={status === "active" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" : "border-amber-500/30 bg-amber-500/15 text-amber-400"} variant="outline">{status === "active" ? "Active" : "Disabled"}</Badge>;
}

function EmployeeEditDialog({ employee, data }: { employee: EmployeeRecord; data: EmployeeWorkspaceData }) {
  const [state, action] = useActionState(updateEmployee.bind(null, employee.id), initialEmployeeActionState);
  return <Dialog><DialogTrigger asChild><Button size="sm" variant="outline">Manage</Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Manage {employee.fullName}</DialogTitle><DialogDescription>Update employment details and ERP access. The employee’s authentication email cannot be changed here.</DialogDescription></DialogHeader><form action={action} className="grid gap-4 md:grid-cols-2"><Field label="Full name" name="fullName" defaultValue={employee.fullName} required /><Field label="Login email" name="email-display" defaultValue={employee.email} type="email" disabled /><Field label="Employee number" name="employeeNumber" defaultValue={employee.employeeNumber === "Not assigned" ? "" : employee.employeeNumber} required /><Field label="Mobile number" name="phone" defaultValue={employee.phone} inputMode="tel" /><Field label="Department" name="department" defaultValue={employee.department} required /><Field label="Designation" name="designation" defaultValue={employee.designation} required /><Field label="Joining date" name="joiningDate" defaultValue={employee.joiningDate} type="date" required /><SelectField label="Role" name="role" defaultValue={employee.role} options={data.roles.map((role) => [role.name, roleLabel(role.name)])} /><SelectField label="Account status" name="status" defaultValue={employee.status} options={[["active", "Active"], ["disabled", "Disabled"]]} /><div className="md:col-span-2"><p role="status" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-500"}>{state.message}</p></div><div className="flex justify-end md:col-span-2"><SubmitButton /></div></form></DialogContent></Dialog>;
}

function SubmitButton() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save employee"}</Button>; }
function Field({ label, name, defaultValue, ...props }: { label: string; name: string; defaultValue: string } & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue">) { const id = useId(); return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} defaultValue={defaultValue} {...props} /></div>; }
function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: string[][] }) { const id = useId(); return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><select id={id} name={name} defaultValue={defaultValue} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>; }
function Metric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: "blue" | "emerald" | "amber" | "purple" }) { const tones = { blue: "bg-blue-500/10 text-blue-400", emerald: "bg-emerald-500/10 text-emerald-400", amber: "bg-amber-500/10 text-amber-400", purple: "bg-purple-500/10 text-purple-400" }; return <Card className="border-border/80 bg-card/90"><CardContent className="flex items-center gap-3 p-4"><div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>; }
