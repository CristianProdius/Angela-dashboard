"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Save, RefreshCw, LogOut, MessageSquare, Wifi, WifiOff, Plus, Trash2, CalendarOff, KeyRound, Moon, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface Settings {
  businessName: string;
  timezone: string;
  workStartHour: number;
  workEndHour: number;
  slotInterval: number;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}

interface WhatsAppStatus {
  status: string;
  name?: string;
}

interface QRResult {
  qr?: string;
  error?: string;
}

interface BlockedDate {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

interface MessageTemplate {
  id: string;
  type: string;
  content: string;
  active: boolean;
  updatedAt: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  FIRST_TIME_INTRO: "Primul mesaj",
  CONFIRMATION: "Confirmare programare",
  REMINDER: "Reminder programare",
  APPOINTMENT_DECLINED: "Programare refuzata",
  PASSWORD_RESET_OTP: "Resetare parola (OTP)",
  RESCHEDULE: "Reprogramare",
};

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  FIRST_TIME_INTRO: ["{clientName}"],
  CONFIRMATION: ["{clientName}", "{dateTime}", "{serviceList}", "{total}"],
  REMINDER: ["{clientName}", "{dateTime}", "{serviceList}"],
  APPOINTMENT_DECLINED: ["{clientName}", "{dateTime}"],
  PASSWORD_RESET_OTP: ["{code}"],
  RESCHEDULE: ["{clientName}", "{oldDateTime}", "{newDateTime}", "{serviceList}"],
};

export default function SettingsPage() {
  const { data: settings } = useSWR<Settings>("/api/settings", fetcher);
  const { data: waStatus, mutate: mutateWa } = useSWR<WhatsAppStatus>(
    "/api/whatsapp/status",
    fetcher,
    { refreshInterval: 10000 }
  );

  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [workStartHour, setWorkStartHour] = useState("");
  const [workEndHour, setWorkEndHour] = useState("");
  const [slotInterval, setSlotInterval] = useState("");
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState("22");
  const [quietHoursEnd, setQuietHoursEnd] = useState("8");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Blocked dates
  const { data: blockedDates, mutate: mutateBlocked } = useSWR<BlockedDate[]>(
    "/api/settings/blocked-dates",
    fetcher
  );
  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
  const [blockedStart, setBlockedStart] = useState<Date | undefined>();
  const [blockedEnd, setBlockedEnd] = useState<Date | undefined>();
  const [blockedReason, setBlockedReason] = useState("");
  const [savingBlocked, setSavingBlocked] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Message templates
  const { data: templates, mutate: mutateTemplates } = useSWR<MessageTemplate[]>(
    "/api/settings/message-templates",
    fetcher
  );
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const handleAddBlocked = async () => {
    if (!blockedStart || !blockedEnd) {
      toast.error("Selectati datele de inceput si sfarsit");
      return;
    }
    if (blockedEnd < blockedStart) {
      toast.error("Data de sfarsit trebuie sa fie dupa data de inceput");
      return;
    }
    setSavingBlocked(true);
    try {
      const res = await fetch("/api/settings/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: blockedStart.toISOString(),
          endDate: blockedEnd.toISOString(),
          reason: blockedReason || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Zi libera adaugata");
        setBlockedDialogOpen(false);
        setBlockedStart(undefined);
        setBlockedEnd(undefined);
        setBlockedReason("");
        mutateBlocked();
      } else {
        toast.error("Eroare la adaugare");
      }
    } catch {
      toast.error("Eroare la adaugare");
    } finally {
      setSavingBlocked(false);
    }
  };

  const handleDeleteBlocked = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/blocked-dates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Zi libera stearsa");
        mutateBlocked();
      } else {
        toast.error("Eroare la stergere");
      }
    } catch {
      toast.error("Eroare la stergere");
    }
  };

  useEffect(() => {
    if (settings && !initialized) {
      setBusinessName(settings.businessName);
      setTimezone(settings.timezone);
      setWorkStartHour(settings.workStartHour.toString());
      setWorkEndHour(settings.workEndHour.toString());
      setSlotInterval(settings.slotInterval.toString());
      setQuietHoursEnabled(settings.quietHoursEnabled);
      setQuietHoursStart(settings.quietHoursStart.toString());
      setQuietHoursEnd(settings.quietHoursEnd.toString());
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          timezone,
          workStartHour: parseInt(workStartHour),
          workEndHour: parseInt(workEndHour),
          slotInterval: parseInt(slotInterval),
          quietHoursEnabled,
          quietHoursStart: parseInt(quietHoursStart),
          quietHoursEnd: parseInt(quietHoursEnd),
        }),
      });

      if (res.ok) {
        toast.success("Setari salvate");
        mutate("/api/settings");
      } else {
        toast.error("Eroare la salvare");
      }
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const fetchQR = async () => {
    setQrLoading(true);
    try {
      const res = await fetch("/api/whatsapp/qr");
      const data: QRResult = await res.json();
      if (data.qr) {
        setQrCode(data.qr);
      } else {
        toast.error(data.error || "QR indisponibil");
      }
    } catch {
      toast.error("Eroare la obtinerea QR Code");
    } finally {
      setQrLoading(false);
    }
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setEditContent(template.content);
    setEditActive(template.active);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/settings/message-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editingTemplate.type,
          content: editContent,
          active: editActive,
        }),
      });
      if (res.ok) {
        toast.success("Sablon salvat");
        setEditingTemplate(null);
        mutateTemplates();
      } else {
        toast.error("Eroare la salvare");
      }
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSavingTemplate(false);
    }
  };

  const isConnected = waStatus?.status === "WORKING";

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Setari</h1>

      {/* WhatsApp Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp (WAHA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                Status: {waStatus?.status || "Se verifica..."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Conectat" : "Deconectat"}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() => mutateWa()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {waStatus?.name && (
            <p className="text-sm text-muted-foreground">
              Sesiune: {waStatus.name}
            </p>
          )}

          {!isConnected && (
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={fetchQR}
                disabled={qrLoading}
                className="w-full"
              >
                {qrLoading ? "Se incarca..." : "Obtine QR Code"}
              </Button>
              {qrCode && (
                <div className="flex justify-center p-4 bg-white rounded-md">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Deschideti WhatsApp pe telefon si scanati QR Code-ul
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informatii Afacere</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Numele Frizeriei</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fus Orar</Label>
            <Input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Europe/Chisinau"
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Program de Lucru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inceput (ora)</Label>
              <Input
                type="number"
                min="0"
                max="23"
                value={workStartHour}
                onChange={(e) => setWorkStartHour(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sfarsit (ora)</Label>
              <Input
                type="number"
                min="0"
                max="23"
                value={workEndHour}
                onChange={(e) => setWorkEndHour(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Interval Sloturi (minute)</Label>
            <Input
              type="number"
              min="5"
              max="120"
              value={slotInterval}
              onChange={(e) => setSlotInterval(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Ore de Liniste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activeaza Ore de Liniste</Label>
              <p className="text-xs text-muted-foreground">
                Mesajele trimise in acest interval vor fi puse in coada si trimise dupa terminarea orelor de liniste.
              </p>
            </div>
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
            />
          </div>
          {quietHoursEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inceput (ora)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sfarsit (ora)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Codurile OTP pentru resetarea parolei vor fi trimise imediat, indiferent de orele de liniste.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Blocked Dates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarOff className="h-4 w-4" />
              Zile Libere
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBlockedDialogOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Adauga
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!blockedDates?.length ? (
            <p className="text-sm text-muted-foreground">
              Nicio zi libera configurata
            </p>
          ) : (
            <div className="space-y-2">
              {blockedDates.map((bd) => (
                <div
                  key={bd.id}
                  className="flex items-center justify-between p-2 rounded-md border text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(bd.startDate), "dd/MM/yyyy")}
                      {bd.startDate !== bd.endDate &&
                        ` - ${format(new Date(bd.endDate), "dd/MM/yyyy")}`}
                    </p>
                    {bd.reason && (
                      <p className="text-xs text-muted-foreground">
                        {bd.reason}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBlocked(bd.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={blockedDialogOpen} onOpenChange={setBlockedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adauga Zi Libera</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data inceput</Label>
              <Calendar
                mode="single"
                selected={blockedStart}
                onSelect={setBlockedStart}
                locale={ro}
                className="mx-auto"
              />
            </div>
            <div className="space-y-2">
              <Label>Data sfarsit</Label>
              <Calendar
                mode="single"
                selected={blockedEnd}
                onSelect={setBlockedEnd}
                disabled={blockedStart ? { before: blockedStart } : undefined}
                locale={ro}
                className="mx-auto"
              />
            </div>
            <div className="space-y-2">
              <Label>Motiv (optional)</Label>
              <Input
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="Ex: Vacanta, Sarbatoare..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlockedDialogOpen(false)}
            >
              Anuleaza
            </Button>
            <Button onClick={handleAddBlocked} disabled={savingBlocked}>
              {savingBlocked ? "Se salveaza..." : "Adauga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Sabloane Mesaje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!templates?.length ? (
            <p className="text-sm text-muted-foreground">
              Niciun sablon configurat. Rulati seed-ul pentru a crea sabloanele implicite.
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-2 rounded-md border text-sm"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {TEMPLATE_LABELS[template.type] || template.type}
                      </p>
                      <Badge variant={template.active ? "default" : "secondary"}>
                        {template.active ? "Activ" : "Inactiv"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {template.content.substring(0, 80)}...
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Edit Dialog */}
      <Dialog
        open={editingTemplate !== null}
        onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Editeaza: {editingTemplate ? TEMPLATE_LABELS[editingTemplate.type] || editingTemplate.type : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Activ</Label>
              <Switch
                checked={editActive}
                onCheckedChange={setEditActive}
              />
            </div>
            <div className="space-y-2">
              <Label>Continut mesaj</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            {editingTemplate && TEMPLATE_VARIABLES[editingTemplate.type] && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-medium mb-1">Variabile disponibile:</p>
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES[editingTemplate.type].map((v) => (
                    <code key={v} className="text-xs bg-background px-1.5 py-0.5 rounded">
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTemplate(null)}
            >
              Anuleaza
            </Button>
            <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
              {savingTemplate ? "Se salveaza..." : "Salveaza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Se salveaza..." : "Salveaza Setarile"}
      </Button>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Schimba Parola
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Parola Curenta</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Parola curenta"
            />
          </div>
          <div className="space-y-2">
            <Label>Parola Noua</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minim 6 caractere"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirma Parola Noua</Label>
            <Input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Repeta parola noua"
            />
          </div>
          <Button
            className="w-full"
            variant="outline"
            disabled={changingPassword}
            onClick={async () => {
              if (newPassword !== confirmNewPassword) {
                toast.error("Parolele noi nu coincid");
                return;
              }
              setChangingPassword(true);
              try {
                const res = await fetch("/api/admin/change-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ currentPassword, newPassword }),
                });
                const data = await res.json();
                if (res.ok) {
                  toast.success("Parola a fost schimbata cu succes");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                } else {
                  toast.error(data.error || "Eroare la schimbarea parolei");
                }
              } catch {
                toast.error("Eroare la schimbarea parolei");
              } finally {
                setChangingPassword(false);
              }
            }}
          >
            {changingPassword ? "Se schimba..." : "Schimba Parola"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Button
        variant="outline"
        className="w-full"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Iesire
      </Button>
    </div>
  );
}
