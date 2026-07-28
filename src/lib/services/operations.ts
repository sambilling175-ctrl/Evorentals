import {
  bookings,
  collections,
  customers,
  fleet,
  rentals,
  serviceJobs,
  type OperationsRecord,
} from "@/data/operations";

export interface OperationsRepository {
  listCustomers(): Promise<OperationsRecord[]>;
  listFleet(): Promise<OperationsRecord[]>;
  listBookings(): Promise<OperationsRecord[]>;
  listRentals(): Promise<OperationsRecord[]>;
  listCollections(): Promise<OperationsRecord[]>;
  listServiceJobs(): Promise<OperationsRecord[]>;
}

/** Local review adapter. A Supabase adapter can replace it without changing pages. */
export const demoOperationsRepository: OperationsRepository = {
  async listCustomers() { return customers; },
  async listFleet() { return fleet; },
  async listBookings() { return bookings; },
  async listRentals() { return rentals; },
  async listCollections() { return collections; },
  async listServiceJobs() { return serviceJobs; },
};
