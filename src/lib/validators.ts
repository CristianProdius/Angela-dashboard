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
  quietHoursEnabled: z.boolean().optional().default(false),
  quietHoursStart: z.coerce.number().int().min(0).max(23).optional().default(22),
  quietHoursEnd: z.coerce.number().int().min(0).max(23).optional().default(8),
}).refine((data) => data.workStartHour < data.workEndHour, {
  message: "Ora de inceput trebuie sa fie inainte de ora de sfarsit",
  path: ["workEndHour"],
});

export const messageTemplateSchema = z.object({
  content: z.string().min(1, "Continutul este obligatoriu"),
  active: z.boolean(),
});

export const clientRegisterSchema = z.object({
  name: z.string().min(1, "Numele este obligatoriu"),
  phone: z
    .string()
    .min(10, "Telefonul trebuie sa aiba cel putin 10 cifre")
    .max(15, "Telefon prea lung")
    .regex(/^\d+$/, "Doar cifre"),
  password: z.string().min(6, "Parola trebuie sa aiba cel putin 6 caractere"),
});

export const clientLoginSchema = z.object({
  phone: z
    .string()
    .min(10, "Telefonul trebuie sa aiba cel putin 10 cifre")
    .max(15, "Telefon prea lung")
    .regex(/^\d+$/, "Doar cifre"),
  password: z.string().min(1, "Parola este obligatorie"),
});

export const clientBookingSchema = z.object({
  serviceIds: z.array(z.string()).min(1, "Selectati cel putin un serviciu"),
  dateTime: z.string().min(1, "Data/ora este obligatorie"),
});

export const blockedDateSchema = z.object({
  startDate: z.string().min(1, "Data de inceput este obligatorie"),
  endDate: z.string().min(1, "Data de sfarsit este obligatorie"),
  reason: z.string().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: "Data de sfarsit trebuie sa fie dupa data de inceput",
  path: ["endDate"],
});

export const passwordResetSchema = z.object({
  phone: z
    .string()
    .min(10, "Telefonul trebuie sa aiba cel putin 10 cifre")
    .max(15, "Telefon prea lung")
    .regex(/^\d+$/, "Doar cifre"),
  code: z.string().length(6, "Codul trebuie sa aiba 6 cifre").regex(/^\d+$/, "Doar cifre"),
  newPassword: z.string().min(6, "Parola trebuie sa aiba cel putin 6 caractere"),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ClientRegisterInput = z.infer<typeof clientRegisterSchema>;
export type ClientLoginInput = z.infer<typeof clientLoginSchema>;
export type ClientBookingInput = z.infer<typeof clientBookingSchema>;
export type BlockedDateInput = z.infer<typeof blockedDateSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>;
