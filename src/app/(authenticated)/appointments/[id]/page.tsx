"use client";

import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import { useRouter } from "next/navigation";
import { fetcher } from "@/lib/fetcher";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  ArrowLeft,
  Phone,
  Clock,
  DollarSign,
  Trash2,
  MessageSquare,
  CalendarIcon,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

interface AppointmentService {
  service: { name: string; durationMinutes: number };
  priceAtBooking: number;
}

interface AppointmentDetail {
  id: string;
  dateTime: string;
  endDateTime: string;
  status: string;
  notes: string | null;
  notificationSent: boolean;
  reminderSent: boolean;
  rescheduleSent: boolean;
  client: { id: string; name: string; phone: string };
  services: AppointmentService[];
}

const statusOptions = [
  { value: "PENDING", label: "In asteptare" },
  { value: "SCHEDULED", label: "Programat" },
  { value: "COMPLETED", label: "Finalizat" },
  { value: "CANCELLED", label: "Anulat" },
  { value: "NO_SHOW", label: "Neprezentare" },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "outline",
};

const minutes = [0, 15, 30, 45];

export default function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleHour, setRescheduleHour] = useState("10");
  const [rescheduleMinute, setRescheduleMinute] = useState("0");
  const [rescheduling, setRescheduling] = useState(false);

  const { data: settings } = useSWR<{ workStartHour: number; workEndHour: number }>(
    "/api/settings",
    fetcher
  );
  const hours = Array.from(
    { length: (settings?.workEndHour ?? 20) - (settings?.workStartHour ?? 8) },
    (_, i) => i + (settings?.workStartHour ?? 8)
  );

  const { data: appointment } = useSWR<AppointmentDetail>(
    `/api/appointments/${id}`,
    fetcher
  );

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        mutate(`/api/appointments/${id}`);
        toast.success("Status actualizat");
      } else {
        toast.error("Eroare la actualizarea statusului");
      }
    } catch {
      toast.error("Eroare la actualizarea statusului");
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) {
      toast.error("Selecteaza o data");
      return;
    }

    setRescheduling(true);
    try {
      const newDateTime = new Date(rescheduleDate);
      newDateTime.setHours(parseInt(rescheduleHour), parseInt(rescheduleMinute), 0, 0);

      const res = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateTime: newDateTime.toISOString() }),
      });

      if (res.ok) {
        mutate(`/api/appointments/${id}`);
        setRescheduleOpen(false);
        toast.success("Programare reprogramata cu succes");
      } else {
        const data = await res.json();
        toast.error(data.error || "Eroare la reprogramare");
      }
    } catch {
      toast.error("Eroare la reprogramare");
    } finally {
      setRescheduling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sunteti sigur ca doriti sa stergeti aceasta programare?")) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Programare stearsa");
        router.push("/dashboard");
      } else {
        toast.error("Eroare la stergere");
      }
    } catch {
      toast.error("Eroare la stergere");
    }
  };

  const openRescheduleDialog = () => {
    if (appointment) {
      const current = new Date(appointment.dateTime);
      setRescheduleDate(current);
      setRescheduleHour(current.getHours().toString());
      setRescheduleMinute(current.getMinutes().toString());
    }
    setRescheduleOpen(true);
  };

  if (!appointment) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Se incarca...</p>
      </div>
    );
  }

  const total = appointment.services.reduce(
    (sum, s) => sum + s.priceAtBooking,
    0
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Programare</h1>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={statusVariant[appointment.status]}>
                {statusOptions.find((s) => s.value === appointment.status)?.label}
              </Badge>
            </div>
            <Select
              value={appointment.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accept / Decline for PENDING */}
      {appointment.status === "PENDING" && (
        <Card className="border-yellow-500/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              Aceasta programare asteapta confirmare
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleStatusChange("SCHEDULED")}
              >
                <Check className="h-4 w-4 mr-1" />
                Accepta
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => handleStatusChange("CANCELLED")}
              >
                <X className="h-4 w-4 mr-1" />
                Refuza
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href={`/clients/${appointment.client.id}`}
            className="font-medium hover:underline"
          >
            {appointment.client.name}
          </Link>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            {appointment.client.phone}
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Data si Ora</CardTitle>
            {(appointment.status === "SCHEDULED" || appointment.status === "PENDING") && (
              <Button
                variant="outline"
                size="sm"
                onClick={openRescheduleDialog}
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                Reprogrameaza
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(appointment.dateTime), "dd/MM/yyyy")} de la{" "}
              {format(new Date(appointment.dateTime), "HH:mm")} pana la{" "}
              {format(new Date(appointment.endDateTime), "HH:mm")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Servicii</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {appointment.services.map((svc, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <span>{svc.service.name}</span>
                <span className="text-muted-foreground ml-2">
                  ({svc.service.durationMinutes}min)
                </span>
              </div>
              <span>{svc.priceAtBooking.toFixed(2)} MDL</span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total
            </div>
            <span>{total.toFixed(2)} MDL</span>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notificari
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Confirmare trimisa</span>
            <Badge variant={appointment.notificationSent ? "secondary" : "outline"}>
              {appointment.notificationSent ? "Da" : "Nu"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Reminder trimis</span>
            <Badge variant={appointment.reminderSent ? "secondary" : "outline"}>
              {appointment.reminderSent ? "Da" : "Nu"}
            </Badge>
          </div>
          {appointment.rescheduleSent && (
            <div className="flex justify-between">
              <span>Reprogramare trimisa</span>
              <Badge variant="secondary">Da</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {appointment.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Observatii</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{appointment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Sterge Programare
      </Button>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogrameaza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Calendar
              mode="single"
              selected={rescheduleDate}
              onSelect={setRescheduleDate}
              disabled={{ before: new Date() }}
              className="mx-auto"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Ora:</label>
              <Select value={rescheduleHour} onValueChange={setRescheduleHour}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>:</span>
              <Select value={rescheduleMinute} onValueChange={setRescheduleMinute}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleOpen(false)}
            >
              Anuleaza
            </Button>
            <Button onClick={handleReschedule} disabled={rescheduling}>
              {rescheduling ? "Se salveaza..." : "Salveaza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
