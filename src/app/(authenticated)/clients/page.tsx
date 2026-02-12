"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhoneInput } from "@/components/phone-input";
import { Plus, Search, Phone, User } from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("373");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: clients } = useSWR<Client[]>(
    `/api/clients?search=${search}`,
    fetcher
  );

  const handleCreate = async () => {
    if (!name || phone.length < 5) {
      toast.error("Numele si telefonul sunt obligatorii");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, notes: notes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Eroare la crearea clientului");
        return;
      }

      toast.success("Client creat cu succes!");
      setDialogOpen(false);
      setName("");
      setPhone("373");
      setNotes("");
      mutate(`/api/clients?search=${search}`);
    } catch {
      toast.error("Eroare la crearea clientului");
    } finally {
      setSaving(false);
    }
  };

  const formatPhone = (p: string) => {
    if (p.startsWith("373")) return `+373 ${p.slice(3)}`;
    if (p.startsWith("40")) return `+40 ${p.slice(2)}`;
    return `+${p}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clienti</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nou
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Client Nou</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nume</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nume complet"
                />
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
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? "Se salveaza..." : "Salveaza"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cautati dupa nume sau telefon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Client List */}
      <div className="space-y-2">
        {clients?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Niciun client gasit
          </p>
        )}
        {clients?.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{client.name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {formatPhone(client.phone)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
