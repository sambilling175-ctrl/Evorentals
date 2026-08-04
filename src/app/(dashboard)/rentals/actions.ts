"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activateBooking, extendRental } from "@/lib/services/rentals";
import type { RentalActionState } from "@/lib/rentals/action-state";

const schema=z.object({bookingId:z.string().uuid(),startedAt:z.iso.datetime({local:true}),startOdometer:z.coerce.number().int().min(0).max(10000000)});
export async function activateRental(_:RentalActionState,formData:FormData):Promise<RentalActionState>{const parsed=schema.safeParse(Object.fromEntries(formData));if(!parsed.success)return{status:"error",message:parsed.error.issues[0]?.message??"Check activation details"};try{const result=await activateBooking({...parsed.data,startedAt:new Date(`${parsed.data.startedAt}:00+05:30`).toISOString()});revalidatePath("/rentals");revalidatePath("/bookings");revalidatePath("/fleet");revalidatePath("/");return{status:"success",message:`${result.rentalNumber} activated`};}catch(error){return{status:"error",message:error instanceof Error?error.message:"Unable to activate rental"};}}

const extensionSchema=z.object({rentalId:z.string().uuid(),extendedEndAt:z.iso.datetime({local:true}),reason:z.string().trim().max(500).optional()});
export async function extendActiveRental(_:RentalActionState,formData:FormData):Promise<RentalActionState>{const parsed=extensionSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return{status:"error",message:parsed.error.issues[0]?.message??"Check extension details"};try{const result=await extendRental({...parsed.data,extendedEndAt:new Date(`${parsed.data.extendedEndAt}:00+05:30`).toISOString()});revalidatePath("/rentals");revalidatePath("/bookings");revalidatePath("/fleet");revalidatePath("/");return{status:"success",message:`${result.rentalNumber} extended · ${new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(result.extensionAmount)} added`};}catch(error){return{status:"error",message:error instanceof Error?error.message:"Unable to extend rental"};}}
