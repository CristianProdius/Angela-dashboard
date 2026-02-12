"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isSameDay,
} from "date-fns";
import { ro } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Appointment, STATUS_MAP } from "@/types";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  const from = startOfMonth(month).toISOString();
  const to = endOfMonth(month).toISOString();

  const { data: appointments } = useSWR<Appointment[]>(
    `/api/appointments?from=${from}&to=${to}`,
    fetcher
  );

  const dayAppointments =
    appointments?.filter((a) =>
      isSameDay(new Date(a.dateTime), selectedDate)
    ) || [];

  // Get dates that have appointments for dot indicators
  const appointmentDates = new Set(
    appointments?.map((a) => format(new Date(a.dateTime), "yyyy-MM-dd")) || []
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Link href="/appointments/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Programeaza
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-4">
        <Card>
          <CardContent className="pt-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={month}
              onMonthChange={setMonth}
              locale={ro}
              modifiers={{
                hasAppointment: (date) =>
                  appointmentDates.has(format(date, "yyyy-MM-dd")),
              }}
              modifiersClassNames={{
                hasAppointment:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {format(selectedDate, "dd MMMM, EEEE", { locale: ro })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayAppointments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nicio programare in aceasta zi
              </p>
            ) : (
              <div className="space-y-2">
                {dayAppointments.map((apt) => (
                  <Link key={apt.id} href={`/appointments/${apt.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="text-center min-w-[50px]">
                        <p className="font-mono text-sm font-bold">
                          {format(new Date(apt.dateTime), "HH:mm")}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {apt.client.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {apt.services.map((s) => s.service.name).join(", ")}
                        </p>
                      </div>
                      <Badge
                        variant={STATUS_MAP[apt.status]?.variant || "default"}
                        className="text-xs"
                      >
                        {STATUS_MAP[apt.status]?.label || apt.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
