"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import Link from "next/link";
import { Scissors } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("373");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/client/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (res.ok) {
        toast.success("Codul a fost trimis pe WhatsApp");
        setStep(2);
      } else {
        toast.error("Eroare la trimiterea codului");
      }
    } catch {
      toast.error("Eroare la trimiterea codului");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Parolele nu coincid");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/client/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Eroare la resetare";
        toast.error(msg);
        return;
      }

      toast.success("Parola a fost schimbata cu succes!");
      // Use full navigation to ensure the Set-Cookie from reset-password is applied
      window.location.href = "/client/dashboard";
    } catch {
      toast.error("Eroare la resetare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Scissors className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Resetare Parola</CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === 1
              ? "Introdu numarul de telefon pentru a primi un cod"
              : "Introdu codul primit pe WhatsApp si noua parola"}
          </p>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Se trimite..." : "Trimite Codul"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label>Cod de verificare</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Parola noua</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minim 6 caractere"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirma Parola</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeta parola"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Se reseteaza..." : "Reseteaza Parola"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep(1)}
              >
                Trimite un cod nou
              </Button>
            </form>
          )}
          <div className="mt-4 text-center">
            <Link
              href="/client/login"
              className="text-sm text-muted-foreground hover:underline"
            >
              Inapoi la autentificare
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
