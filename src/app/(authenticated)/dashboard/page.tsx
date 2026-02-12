"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { format, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, DollarSign, Clock, Users, Plus } from "lucide-react";
import Link from "next/link";

interface AppointmentService {
  service: { name: string };
  priceAtBooking: number;
}

interface Appointment {
  id: string;
  dateTime: string;
  endDateTime: string;
  status: string;
  notes: string | null;
  client: { id: string; name: string; phone: string };
  services: AppointmentService[];
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SCHEDULED: { label: "Programat", variant: "default" },
  COMPLETED: { label: "Finalizat", variant: "secondary" },
  CANCELLED: { label: "Anulat", variant: "destructive" },
  NO_SHOW: { label: "Neprezentare", variant: "outline" },
};

export default function DashboardPage() {
  const today = new Date();
  const from = startOfDay(today).toISOString();
  const to = endOfDay(today).toISOString();

  const { data: appointments } = useSWR<Appointment[]>(
    `/api/appointments?from=${from}&to=${to}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const scheduled = appointments?.filter((a) => a.status === "SCHEDULED") || [];
  const completed = appointments?.filter((a) => a.status === "COMPLETED") || [];
  const totalRevenue =
    appointments
      ?.filter((a) => a.status === "COMPLETED")
      .reduce(
        (sum, a) =>
          sum + a.services.reduce((s, svc) => s + svc.priceAtBooking, 0),
        0
      ) || 0;

  const now = new Date();
  const nextAppointment = scheduled.find(
    (a) => new Date(a.dateTime) > now
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panou</h1>
          <p className="text-muted-foreground">
            {format(today, "dd/MM/yyyy")} - Azi
          </p>
        </div>
        <Link href="/appointments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Programeaza
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Azi</p>
            </div>
            <p className="text-2xl font-bold mt-1">
              {appointments?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Programate</p>
            </div>
            <p className="text-2xl font-bold mt-1">{scheduled.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Finalizate</p>
            </div>
            <p className="text-2xl font-bold mt-1">{completed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Venit</p>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalRevenue.toFixed(2)} MDL
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Up */}
      {nextAppointment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Urmatoarea Programare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {nextAppointment.client.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {nextAppointment.services
                    .map((s) => s.service.name)
                    .join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg">
                  {format(new Date(nextAppointment.dateTime), "HH:mm")}
                </p>
                <p className="text-xs text-muted-foreground">
                  pana la {format(new Date(nextAppointment.endDateTime), "HH:mm")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Agenda de Azi</h2>
        {!appointments?.length && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nicio programare pentru azi
            </CardContent>
          </Card>
        )}
        <div className="space-y-2">
          {appointments?.map((apt) => (
            <Link key={apt.id} href={`/appointments/${apt.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="py-3 flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <p className="font-mono font-bold">
                      {format(new Date(apt.dateTime), "HH:mm")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.endDateTime), "HH:mm")}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{apt.client.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {apt.services.map((s) => s.service.name).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {apt.services
                        .reduce((s, svc) => s + svc.priceAtBooking, 0)
                        .toFixed(2)}{" "}MDL
                    </span>
                    <Badge variant={statusMap[apt.status]?.variant || "default"}>
                      {statusMap[apt.status]?.label || apt.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
