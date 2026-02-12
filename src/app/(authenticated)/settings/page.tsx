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
import { Save, RefreshCw, LogOut, MessageSquare, Wifi, WifiOff } from "lucide-react";

interface Settings {
  businessName: string;
  timezone: string;
  workStartHour: number;
  workEndHour: number;
  slotInterval: number;
}

interface WhatsAppStatus {
  status: string;
  name?: string;
}

interface QRResult {
  qr?: string;
  error?: string;
}

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
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (settings && !initialized) {
      setBusinessName(settings.businessName);
      setTimezone(settings.timezone);
      setWorkStartHour(settings.workStartHour.toString());
      setWorkEndHour(settings.workEndHour.toString());
      setSlotInterval(settings.slotInterval.toString());
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

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Se salveaza..." : "Salveaza Setarile"}
      </Button>

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
