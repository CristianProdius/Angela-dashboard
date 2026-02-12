"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export default function ServicesPage() {
  const { data: services } = useSWR<Service[]>("/api/services", fetcher);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setDuration("");
    setPrice("");
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditId(service.id);
    setName(service.name);
    setDuration(service.durationMinutes.toString());
    setPrice(service.price.toString());
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name || !duration || !price) {
      toast.error("Completati toate campurile");
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/services/${editId}` : "/api/services";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          durationMinutes: parseInt(duration),
          price: parseFloat(price),
          active: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Eroare la salvare");
        return;
      }

      toast.success(editId ? "Serviciu actualizat" : "Serviciu creat");
      setDialogOpen(false);
      resetForm();
      mutate("/api/services");
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Dezactivati acest serviciu?")) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Serviciu dezactivat");
        mutate("/api/services");
      }
    } catch {
      toast.error("Eroare la dezactivare");
    }
  };

  const handleReactivate = async (service: Service) => {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: service.name,
          durationMinutes: service.durationMinutes,
          price: service.price,
          active: true,
        }),
      });
      if (res.ok) {
        toast.success("Serviciu reactivat");
        mutate("/api/services");
      }
    } catch {
      toast.error("Eroare la reactivare");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servicii</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nou
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Editeaza Serviciu" : "Serviciu Nou"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nume</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Tuns"
              />
            </div>
            <div className="space-y-2">
              <Label>Durata (minute)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label>Pret (MDL)</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150.00"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Se salveaza..." : "Salveaza"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviciu</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead>Pret</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services?.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.durationMinutes}min</TableCell>
                  <TableCell>{service.price.toFixed(2)} MDL</TableCell>
                  <TableCell>
                    <Badge variant={service.active ? "default" : "secondary"}>
                      {service.active ? "Activ" : "Inactiv"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(service)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {service.active ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactivate(service)}
                        >
                          Reactiveaza
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
