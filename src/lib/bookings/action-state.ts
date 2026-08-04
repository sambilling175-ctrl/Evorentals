import type { AvailableVehicle } from "@/lib/services/bookings";

export interface AvailabilityState {
  status: "idle" | "success" | "error";
  message: string;
  vehicles: AvailableVehicle[];
  startsAt: string;
  endsAt: string;
  estimatedKm: number;
}

export const initialAvailabilityState: AvailabilityState = {
  status: "idle",
  message: "",
  vehicles: [],
  startsAt: "",
  endsAt: "",
  estimatedKm: 0,
};

export interface BookingActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialBookingActionState: BookingActionState = {
  status: "idle",
  message: "",
};
