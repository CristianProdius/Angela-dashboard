"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { format, startOfDay, endOfDay, addMinutes, parse } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarDays, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

interface Appointment {
  id: string;
  dateTime: string;
  endDateTime: string;
  status: string;
}

interface Settings {
  workStartHour: number;
  workEndHour: number;
  slotInterval: number;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: clients } = useSWR<Client[]>(
    `/api/clients?search=${clientSearch}`,
    fetcher
  );
  const { data: services } = useSWR<Service[]>("/api/services", fetcher);
  const { data: settings } = useSWR<Settings>("/api/settings", fetcher);

  const dayFrom = startOfDay(selectedDate).toISOString();
  const dayTo = endOfDay(selectedDate).toISOString();
  const { data: dayAppointments } = useSWR<Appointment[]>(
    `/api/appointments?from=${dayFrom}&to=${dayTo}`,
    fetcher
  );

  const activeServices = services?.filter((s) => s.active) || [];
  const selectedServiceObjects = activeServices.filter((s) =>
    selectedServices.includes(s.id)
  );
  const totalDuration = selectedServiceObjects.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const totalPrice = selectedServiceObjects.reduce(
    (sum, s) => sum + s.price,
    0
  );

  const selectedClient = clients?.find((c) => c.id === clientId);

  // Generate time slots
  const timeSlots: string[] = [];
  if (settings) {
    const start = settings.workStartHour * 60;
    const end = settings.workEndHour * 60;
    for (let m = start; m < end; m += settings.slotInterval) {
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      timeSlots.push(
        `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
      );
    }
  }

  // Check if a time slot is occupied
  const isSlotOccupied = (time: string): boolean => {
    if (!dayAppointments || totalDuration === 0) return false;
    const slotStart = parse(time, "HH:mm", selectedDate);
    const slotEnd = addMinutes(slotStart, totalDuration);

    return dayAppointments.some((apt) => {
      if (apt.status === "CANCELLED") return false;
      const aptStart = new Date(apt.dateTime);
      const aptEnd = new Date(apt.endDateTime);
      return slotStart < aptEnd && slotEnd > aptStart;
    });
  };

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error("Selectati un client");
      return;
    }
    if (selectedServices.length === 0) {
      toast.error("Selectati cel putin un serviciu");
      return;
    }
    if (!selectedTime) {
      toast.error("Selectati o ora");
      return;
    }

    const dateTime = parse(selectedTime, "HH:mm", selectedDate);

    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          dateTime: dateTime.toISOString(),
          serviceIds: selectedServices,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Eroare la crearea programarii");
        return;
      }

      toast.success("Programare creata cu succes!");
      router.push("/dashboard");
    } catch {
      toast.error("Eroare la crearea programarii");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Programare Noua</h1>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={clientOpen} onOpenChange={setClientOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={clientOpen}
                className="w-full justify-between"
              >
                {selectedClient
                  ? `${selectedClient.name} - ${selectedClient.phone}`
                  : "Selectati client..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Cautati client..."
                  value={clientSearch}
                  onValueChange={setClientSearch}
                />
                <CommandList>
                  <CommandEmpty>Niciun client gasit</CommandEmpty>
                  <CommandGroup>
                    {clients?.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={`${client.name} ${client.phone}`}
                        onSelect={() => {
                          setClientId(client.id);
                          setClientOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            clientId === client.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {client.name} - {client.phone}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Servicii</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeServices.map((service) => (
            <label
              key={service.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
            >
              <Checkbox
                checked={selectedServices.includes(service.id)}
                onCheckedChange={(checked) => {
                  setSelectedServices((prev) =>
                    checked
                      ? [...prev, service.id]
                      : prev.filter((id) => id !== service.id)
                  );
                  setSelectedTime(""); // Reset time when services change
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{service.name}</p>
                <p className="text-xs text-muted-foreground">
                  {service.durationMinutes}min
                </p>
              </div>
              <span className="text-sm font-medium">
                {service.price.toFixed(2)} MDL
              </span>
            </label>
          ))}
          {selectedServices.length > 0 && (
            <div className="flex justify-between pt-2 border-t text-sm font-medium">
              <span>Total: {totalDuration}min</span>
              <span>{totalPrice.toFixed(2)} MDL</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Data si Ora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="mr-2 h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy", { locale: ro })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setSelectedTime("");
                  }
                }}
                locale={ro}
              />
            </PopoverContent>
          </Popover>

          {selectedServices.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {timeSlots.map((time) => {
                const occupied = isSlotOccupied(time);
                return (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    disabled={occupied}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "font-mono text-xs",
                      occupied && "opacity-30 line-through"
                    )}
                  >
                    {time}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Observatii</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observatii optionale..."
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={submitting || !clientId || selectedServices.length === 0 || !selectedTime}
      >
        {submitting ? "Se creeaza..." : "Creeaza Programare"}
      </Button>
    </div>
  );
}
