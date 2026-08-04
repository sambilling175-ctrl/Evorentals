export interface RentalActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialRentalActionState: RentalActionState = { status: "idle", message: "" };
