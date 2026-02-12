"use client";

import { use, useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useRouter } from "next/navigation";
import { fetcher } from "@/lib/fetcher";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/phone-input";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";

interface AppointmentService {
  service: { name: string };
  priceAtBooking: number;
}

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  services: AppointmentService[];
}

interface ClientDetail {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  appointments: Appointment[];
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: client } = useSWR<ClientDetail>(
    `/api/clients/${id}`,
    fetcher
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("373");
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client && !initialized) {
      setName(client.name);
      setPhone(client.phone);
      setNotes(client.notes || "");
      setInitialized(true);
    }
  }, [client, initialized]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Eroare la salvare");
        return;
      }

      toast.success("Client actualizat");
      mutate(`/api/clients/${id}`);
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sunteti sigur ca doriti sa stergeti acest client?")) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Eroare la stergere");
        return;
      }
      toast.success("Client sters");
      router.push("/clients");
    } catch {
      toast.error("Eroare la stergere");
    }
  };

  if (!client) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Se incarca...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Client</h1>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informatii</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nume</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefon</Label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
            />
          </div>
          <div className="space-y-2">
            <Label>Observatii</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Se salveaza..." : "Salveaza"}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Istoricul Programarilor</CardTitle>
        </CardHeader>
        <CardContent>
          {client.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nicio programare
            </p>
          ) : (
            <div className="space-y-2">
              {client.appointments.map((apt) => (
                <Link key={apt.id} href={`/appointments/${apt.id}`}>
                  <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 cursor-pointer text-sm">
                    <div>
                      <p className="font-medium">
                        {format(new Date(apt.dateTime), "dd/MM/yyyy HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {apt.services.map((s) => s.service.name).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          apt.status === "COMPLETED"
                            ? "secondary"
                            : apt.status === "SCHEDULED"
                            ? "default"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {apt.status === "SCHEDULED"
                          ? "Programat"
                          : apt.status === "COMPLETED"
                          ? "Finalizat"
                          : apt.status === "CANCELLED"
                          ? "Anulat"
                          : "Neprezentare"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {apt.services
                          .reduce((sum, s) => sum + s.priceAtBooking, 0)
                          .toFixed(2)}{" "}
                        MDL
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
