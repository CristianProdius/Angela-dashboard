"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { format, parse } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

interface BlockedDate {
  id: string;
  startDate: string;
  endDate: string;
}

export default function ClientBookPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: services } = useSWR<Service[]>(
    "/api/client/services",
    fetcher
  );
  const { data: blockedDates } = useSWR<BlockedDate[]>(
    "/api/client/blocked-dates",
    fetcher
  );

  const dateStr = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : null;

  const { data: slots } = useSWR<string[]>(
    dateStr && selectedServices.length > 0
      ? `/api/client/slots?date=${dateStr}&serviceIds=${selectedServices.join(",")}`
      : null,
    fetcher
  );

  const selectedServiceObjects =
    services?.filter((s) => selectedServices.includes(s.id)) || [];
  const totalDuration = selectedServiceObjects.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const totalPrice = selectedServiceObjects.reduce(
    (sum, s) => sum + s.price,
    0
  );

  const isDateBlocked = (date: Date): boolean => {
    if (!blockedDates) return false;
    // Normalize to date-only (YYYY-MM-DD) to avoid timezone offset issues
    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dStr = toDateStr(date);
    return blockedDates.some((bd) => {
      const startStr = new Date(bd.startDate).toISOString().slice(0, 10);
      const endStr = new Date(bd.endDate).toISOString().slice(0, 10);
      return dStr >= startStr && dStr <= endStr;
    });
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;

    const dateTime = parse(selectedTime, "HH:mm", selectedDate);

    setSubmitting(true);
    try {
      const res = await fetch("/api/client/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServices,
          dateTime: dateTime.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Eroare la programare"
        );
        return;
      }

      toast.success(
        "Programare trimisa! Vei fi notificat cand este confirmata."
      );
      router.push("/client/dashboard");
    } catch {
      toast.error("Eroare la programare");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/client/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Programare Noua</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn(step >= 1 && "text-primary font-medium")}>
          1. Servicii
        </span>
        <span>→</span>
        <span className={cn(step >= 2 && "text-primary font-medium")}>
          2. Data
        </span>
        <span>→</span>
        <span className={cn(step >= 3 && "text-primary font-medium")}>
          3. Ora
        </span>
        <span>→</span>
        <span className={cn(step >= 4 && "text-primary font-medium")}>
          4. Confirma
        </span>
      </div>

      {/* Step 1: Services */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selecteaza Servicii</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {services?.map((service) => (
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
                    setSelectedTime("");
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
              <>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Total: {totalDuration}min</span>
                  <span>{totalPrice.toFixed(2)} MDL</span>
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={() => setStep(2)}
                >
                  Continua
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Date */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selecteaza Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setSelectedTime("");
                  setStep(3);
                }
              }}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today || isDateBlocked(date);
              }}
              locale={ro}
              className="mx-auto"
            />
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => setStep(1)}
            >
              Inapoi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Time */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Selecteaza Ora —{" "}
              {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ro })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!slots ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Se incarca...
              </p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nu sunt sloturi disponibile pentru aceasta zi
              </p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedTime(time);
                      setStep(4);
                    }}
                    className="font-mono text-xs"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => {
                setSelectedTime("");
                setStep(2);
              }}
            >
              Inapoi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Confirma Programarea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Servicii</p>
              {selectedServiceObjects.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span>{s.name} ({s.durationMinutes}min)</span>
                  <span>{s.price.toFixed(2)} MDL</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span>Total</span>
              <span>{totalPrice.toFixed(2)} MDL</span>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Data si Ora</p>
              <p className="text-sm font-medium">
                {selectedDate &&
                  format(selectedDate, "dd/MM/yyyy", { locale: ro })}{" "}
                la {selectedTime}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <Check className="h-4 w-4 mr-1" />
              {submitting ? "Se trimite..." : "Trimite Programarea"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep(3)}
            >
              Inapoi
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
