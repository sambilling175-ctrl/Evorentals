"use client";

import { Pencil } from "lucide-react";
import { updateCustomer } from "@/app/(dashboard)/customers/actions";
import type { CustomerDetail } from "@/lib/services/customers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerEditDialog({ customer }: { customer: CustomerDetail }) {
  const primaryAddress = customer.addresses.find((address) => address.isPrimary) ?? customer.addresses[0] ?? null;
  const action = updateCustomer.bind(null, customer.id, primaryAddress?.id ?? null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Pencil className="h-4 w-4" />Edit customer</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
          <DialogDescription>Update the profile and primary address. Changes are recorded in the timeline.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" name="fullName" defaultValue={customer.fullName} required />
          <Field label="Mobile number" name="phone" inputMode="numeric" defaultValue={customer.phone ?? ""} required />
          <Field label="Email" name="email" type="email" defaultValue={customer.email ?? ""} />
          <Field label="Driving licence" name="licenseNumber" defaultValue={customer.licenseNumber ?? ""} />
          <Field label="Date of birth" name="dateOfBirth" type="date" defaultValue={customer.dateOfBirth ?? ""} />
          <Field label="Emergency contact" name="emergencyContact" defaultValue={customer.emergencyContact ?? ""} />
          <div className="md:col-span-2"><Field label="Address line 1" name="line1" defaultValue={primaryAddress?.line1 ?? ""} required /></div>
          <div className="md:col-span-2"><Field label="Address line 2" name="line2" defaultValue={primaryAddress?.line2 ?? ""} /></div>
          <Field label="City" name="city" defaultValue={primaryAddress?.city ?? ""} required />
          <Field label="State" name="state" defaultValue={primaryAddress?.state ?? ""} required />
          <Field label="PIN code" name="pinCode" inputMode="numeric" defaultValue={primaryAddress?.pinCode ?? ""} required />
          <div className="flex justify-end md:col-span-2"><Button type="submit">Save changes</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field(props: React.ComponentProps<typeof Input> & { label: string }) {
  const { label, name, ...inputProps } = props;
  return <div className="space-y-2"><Label htmlFor={`edit-${name}`}>{label}</Label><Input id={`edit-${name}`} name={name} {...inputProps} /></div>;
}
