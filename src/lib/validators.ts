import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Numele este obligatoriu"),
  phone: z
    .string()
    .min(10, "Telefonul trebuie sa aiba cel putin 10 cifre")
    .max(15, "Telefon prea lung")
    .regex(/^\d+$/, "Doar cifre"),
  notes: z.string().optional(),
});

export const serviceSchema = z.object({
  name: z.string().min(1, "Numele este obligatoriu"),
  durationMinutes: z.coerce.number().int().min(5, "Minim 5 minute"),
  price: z.coerce.number().min(0, "Pretul nu poate fi negativ"),
  active: z.boolean().optional().default(true),
});

export const appointmentSchema = z.object({
  clientId: z.string().min(1, "Clientul este obligatoriu"),
  dateTime: z.string().min(1, "Data/ora este obligatorie"),
  serviceIds: z.array(z.string()).min(1, "Selectati cel putin un serviciu"),
  notes: z.string().optional(),
});

export const settingsSchema = z.object({
  businessName: z.string().min(1, "Numele este obligatoriu"),
  timezone: z.string().min(1, "Timezone obligatoriu"),
  workStartHour: z.coerce.number().int().min(0).max(23),
  workEndHour: z.coerce.number().int().min(0).max(23),
  slotInterval: z.coerce.number().int().min(5).max(120),
}).refine((data) => data.workStartHour < data.workEndHour, {
  message: "Ora de inceput trebuie sa fie inainte de ora de sfarsit",
  path: ["workEndHour"],
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
