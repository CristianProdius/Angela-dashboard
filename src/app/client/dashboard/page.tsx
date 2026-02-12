"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { ClientAppointment, STATUS_MAP } from "@/types";

export default function ClientDashboardPage() {
  const [showPast, setShowPast] = useState(false);

  const { data: appointments } = useSWR<ClientAppointment[]>(
    "/api/client/appointments",
    fetcher,
    { refreshInterval: 30000 }
  );

  const now = new Date();
  const upcoming =
    appointments?.filter(
      (a) =>
        new Date(a.dateTime) >= now &&
        (a.status === "PENDING" || a.status === "SCHEDULED")
    ) || [];

  const past =
    appointments?.filter(
      (a) =>
        new Date(a.dateTime) < now ||
        a.status === "COMPLETED" ||
        a.status === "CANCELLED" ||
        a.status === "NO_SHOW"
    ) || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Programarile Mele</h1>
        <Link href="/client/book">
          <Button size="sm">
            <CalendarDays className="h-4 w-4 mr-1" />
            Programeaza
          </Button>
        </Link>
      </div>

      {/* Upcoming */}
      {upcoming.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nu ai programari viitoare.
            <br />
            <Link href="/client/book" className="text-primary hover:underline">
              Programeaza acum
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {upcoming
            .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
            .map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowPast(!showPast)}
          >
            <span className="text-sm text-muted-foreground">
              Programari trecute ({past.length})
            </span>
            {showPast ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          {showPast && (
            <div className="space-y-2 mt-2">
              {past
                .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
                .map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: ClientAppointment }) {
  const config = STATUS_MAP[appointment.status] || {
    label: appointment.status,
    variant: "outline" as const,
  };
  const total = appointment.services.reduce(
    (sum, s) => sum + s.priceAtBooking,
    0
  );

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">
              {format(new Date(appointment.dateTime), "dd/MM/yyyy")}
            </p>
            <p className="font-mono text-lg">
              {format(new Date(appointment.dateTime), "HH:mm")} -{" "}
              {format(new Date(appointment.endDateTime), "HH:mm")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {appointment.services.map((s) => s.service.name).join(", ")}
            </p>
          </div>
          <div className="text-right space-y-1">
            <Badge variant={config.variant}>{config.label}</Badge>
            <p className="text-sm font-medium">{total.toFixed(2)} MDL</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
