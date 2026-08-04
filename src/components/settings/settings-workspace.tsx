"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, CreditCard, IndianRupee, Save, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  initialSettingsActionState,
  updateCompanySettings,
  updatePaymentSettings,
  updateRentalSettings,
  updateSystemPreferences,
} from "@/app/(dashboard)/settings/actions";
import type { SettingsActionState } from "@/app/(dashboard)/settings/actions";
import type { SettingsOverview } from "@/lib/services/settings";

function Field({ label, name, defaultValue, type = "text", required = false, ...props }: {
  label: string;
  name: string;
  defaultValue: string | number;
  type?: string;
  required?: boolean;
} & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue" | "type" | "required">) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} type={type} required={required} {...props} />
    </div>
  );
}

function CheckboxField({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <label htmlFor={name} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-muted/15 p-4 transition-colors hover:bg-muted/30">
      <input id={name} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 h-4 w-4 rounded border-input accent-primary" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="gap-2"><Save className="h-4 w-4" />{pending ? "Saving…" : "Save changes"}</Button>;
}

function FormMessage({ state }: { state: SettingsActionState }) {
  if (state.status === "idle") return null;
  return <p role="status" className={state.status === "success" ? "text-sm text-emerald-500" : "text-sm text-destructive"}>{state.message}</p>;
}

function FormFooter({ state }: { state: SettingsActionState }) {
  return <div className="flex flex-col-reverse items-start justify-between gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center"><FormMessage state={state} /><SaveButton /></div>;
}

export function SettingsWorkspace({ settings }: { settings: SettingsOverview }) {
  const [companyState, companyAction] = useActionState(updateCompanySettings, initialSettingsActionState);
  const [rentalState, rentalAction] = useActionState(updateRentalSettings, initialSettingsActionState);
  const [paymentState, paymentAction] = useActionState(updatePaymentSettings, initialSettingsActionState);
  const [preferencesState, preferencesAction] = useActionState(updateSystemPreferences, initialSettingsActionState);

  return (
    <div className="space-y-5">
      {!settings.canManage && (
        <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Settings are read-only for your role. An administrator can update operational configuration.
        </div>
      )}
      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:w-fit lg:grid-cols-4">
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" />Company</TabsTrigger>
          <TabsTrigger value="rental" className="gap-2"><IndianRupee className="h-4 w-4" />Rental rules</TabsTrigger>
          <TabsTrigger value="payment" className="gap-2"><CreditCard className="h-4 w-4" />Payments</TabsTrigger>
          <TabsTrigger value="regional" className="gap-2"><SlidersHorizontal className="h-4 w-4" />Regional</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <SettingsCard title="Company profile" description="Legal identity and contact details used across customer-facing records.">
            <form action={companyAction} className="space-y-5">
              <fieldset disabled={!settings.canManage} className="grid gap-4 md:grid-cols-2 disabled:opacity-70">
                <Field label="Trading name" name="name" defaultValue={settings.company.name} required />
                <Field label="Legal business name" name="legalName" defaultValue={settings.company.legalName} />
                <Field label="GSTIN" name="gstNumber" defaultValue={settings.company.gstNumber} className="uppercase" />
                <Field label="PAN" name="panNumber" defaultValue={settings.company.panNumber} className="uppercase" />
                <div className="md:col-span-2"><Field label="Registered address" name="address" defaultValue={settings.company.address} /></div>
                <Field label="City" name="city" defaultValue={settings.company.city} />
                <Field label="State" name="state" defaultValue={settings.company.state} />
                <Field label="PIN code" name="pinCode" defaultValue={settings.company.pinCode} inputMode="numeric" />
                <Field label="Business phone" name="phone" defaultValue={settings.company.phone} inputMode="tel" />
                <Field label="Business email" name="email" defaultValue={settings.company.email} type="email" />
                <Field label="Website" name="website" defaultValue={settings.company.website} type="url" placeholder="https://" />
                <div className="md:col-span-2"><FormFooter state={companyState} /></div>
              </fieldset>
            </form>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="rental">
          <SettingsCard title="Rental rules" description="Default deposits, late fees, duration limits, and tax controls used by future pricing workflows.">
            <form action={rentalAction} className="space-y-5">
              <fieldset disabled={!settings.canManage} className="grid gap-4 md:grid-cols-3 disabled:opacity-70">
                <Field label="Default deposit (₹)" name="defaultDeposit" defaultValue={settings.rental.defaultDeposit} type="number" min="0" step="0.01" />
                <Field label="Late fee/hour (₹)" name="lateFeePerHour" defaultValue={settings.rental.lateFeePerHour} type="number" min="0" step="0.01" />
                <Field label="Late fee/day (₹)" name="lateFeePerDay" defaultValue={settings.rental.lateFeePerDay} type="number" min="0" step="0.01" />
                <Field label="Minimum duration (days)" name="minimumDuration" defaultValue={settings.rental.minimumDuration} type="number" min="1" />
                <Field label="Maximum duration (days)" name="maximumDuration" defaultValue={settings.rental.maximumDuration} type="number" min="1" />
                <Field label="Grace period (minutes)" name="gracePeriod" defaultValue={settings.rental.gracePeriod} type="number" min="0" />
                <Field label="Cancellation charge (₹)" name="cancellationCharge" defaultValue={settings.rental.cancellationCharge} type="number" min="0" step="0.01" />
                <Field label="Refund window (days)" name="refundDays" defaultValue={settings.rental.refundDays} type="number" min="0" />
                <Field label="Tax percentage" name="taxPercentage" defaultValue={settings.rental.taxPercentage} type="number" min="0" max="100" step="0.01" />
                <div className="md:col-span-3"><CheckboxField name="dynamicPricingEnabled" label="Dynamic pricing" description="Allow future pricing plans to apply demand-based multipliers. Existing confirmed pricing snapshots remain unchanged." defaultChecked={settings.rental.dynamicPricingEnabled} /></div>
                <div className="md:col-span-3"><FormFooter state={rentalState} /></div>
              </fieldset>
            </form>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="payment">
          <SettingsCard title="Payment controls" description="Configure receipt, refund, GST, and allocation behavior for collection workflows.">
            <form action={paymentAction} className="space-y-5">
              <fieldset disabled={!settings.canManage} className="space-y-4 disabled:opacity-70">
                <div className="max-w-sm"><Field label="Invoice prefix" name="invoicePrefix" defaultValue={settings.payment.invoicePrefix} className="uppercase" required /></div>
                <div className="grid gap-3 md:grid-cols-2">
                  <CheckboxField name="partialPaymentsEnabled" label="Partial payments" description="Permit an invoice or due to be settled across multiple payments." defaultChecked={settings.payment.partialPaymentsEnabled} />
                  <CheckboxField name="refundApprovalEnabled" label="Refund approval" description="Require administrative approval before refund processing." defaultChecked={settings.payment.refundApprovalEnabled} />
                  <CheckboxField name="autoReceiptEnabled" label="Automatic receipts" description="Generate a receipt when payment allocation succeeds." defaultChecked={settings.payment.autoReceiptEnabled} />
                  <CheckboxField name="gstEnabled" label="GST invoicing" description="Include configured GST calculations on eligible invoices." defaultChecked={settings.payment.gstEnabled} />
                </div>
                <FormFooter state={paymentState} />
              </fieldset>
            </form>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="regional">
          <SettingsCard title="Regional preferences" description="India-first formatting defaults used by the ERP. These values remain intentionally constrained for the first deployment.">
            <form action={preferencesAction} className="space-y-5">
              <fieldset disabled={!settings.canManage} className="grid gap-4 md:grid-cols-2 disabled:opacity-70">
                <SelectField label="Timezone" name="timezone" defaultValue="Asia/Kolkata" options={[['Asia/Kolkata', 'Asia/Kolkata (IST)']]} />
                <SelectField label="Currency" name="currency" defaultValue="INR" options={[['INR', 'Indian Rupee (INR)']]} />
                <SelectField label="Date format" name="dateFormat" defaultValue={settings.preferences.dateFormat} options={[["DD-MM-YYYY", "DD-MM-YYYY"], ["DD/MM/YYYY", "DD/MM/YYYY"], ["YYYY-MM-DD", "YYYY-MM-DD"]]} />
                <SelectField label="Time format" name="timeFormat" defaultValue={settings.preferences.timeFormat} options={[["hh:mm A", "12-hour"], ["HH:mm", "24-hour"]]} />
                <SelectField label="Language" name="language" defaultValue="en-IN" options={[["en-IN", "English (India)"]]} />
                <SelectField label="Distance unit" name="distanceUnit" defaultValue="KM" options={[["KM", "Kilometres"]]} />
                <div className="md:col-span-2"><FormFooter state={preferencesState} /></div>
              </fieldset>
            </form>
          </SettingsCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70"><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="pt-6">{children}</CardContent></Card>;
}

function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: Array<[string, string]> }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><select id={name} name={name} defaultValue={defaultValue} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>;
}
