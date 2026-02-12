export interface AppointmentService {
  service: { name: string; durationMinutes?: number };
  priceAtBooking: number;
}

export interface Appointment {
  id: string;
  dateTime: string;
  endDateTime: string;
  status: string;
  notes?: string | null;
  client: { id: string; name: string; phone: string };
  services: AppointmentService[];
}

/** Appointment as seen by a client (no client field in response) */
export interface ClientAppointment {
  id: string;
  dateTime: string;
  endDateTime: string;
  status: string;
  services: AppointmentService[];
}

export const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "In asteptare", variant: "outline" },
  SCHEDULED: { label: "Programat", variant: "default" },
  COMPLETED: { label: "Finalizat", variant: "secondary" },
  CANCELLED: { label: "Anulat", variant: "destructive" },
  NO_SHOW: { label: "Neprezentare", variant: "outline" },
};
