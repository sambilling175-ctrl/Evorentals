import { RentalWorkspace } from "@/components/rentals/rental-workspace";
import { getRentalWorkspace } from "@/lib/services/rentals";

export default async function RentalsPage(){const data=await getRentalWorkspace();return <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Rental lifecycle</p><h1 className="mt-2 text-3xl font-bold">Rental operations</h1><p className="mt-2 text-sm text-muted-foreground">Activate contracts, manage open rentals, and record return inspections before settlement.</p></div><RentalWorkspace data={data}/></div>}
