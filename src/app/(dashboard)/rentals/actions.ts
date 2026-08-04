"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activateBooking } from "@/lib/services/rentals";
import type { RentalActionState } from "@/lib/rentals/action-state";

const schema=z.object({bookingId:z.string().uuid(),startedAt:z.iso.datetime({local:true}),startOdometer:z.coerce.number().int().min(0).max(10000000)});
export async function activateRental(_:RentalActionState,formData:FormData):Promise<RentalActionState>{const parsed=schema.safeParse(Object.fromEntries(formData));if(!parsed.success)return{status:"error",message:parsed.error.issues[0]?.message??"Check activation details"};try{const result=await activateBooking({...parsed.data,startedAt:new Date(`${parsed.data.startedAt}:00+05:30`).toISOString()});revalidatePath("/rentals");revalidatePath("/bookings");revalidatePath("/fleet");revalidatePath("/");return{status:"success",message:`${result.rentalNumber} activated`};}catch(error){return{status:"error",message:error instanceof Error?error.message:"Unable to activate rental"};}}
