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

export default function ClientRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("373");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Parolele nu coincid");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/client/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Eroare la inregistrare";
        toast.error(msg);
        return;
      }

      toast.success("Cont creat cu succes!");
      router.push("/client/dashboard");
    } catch {
      toast.error("Eroare la inregistrare");
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
          <CardTitle className="text-2xl">Inregistrare</CardTitle>
          <p className="text-sm text-muted-foreground">
            Creeaza un cont pentru a face programari
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nume</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Numele tau"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <PhoneInput value={phone} onChange={setPhone} />
            </div>
            <div className="space-y-2">
              <Label>Parola</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Se creeaza contul..." : "Creeaza Cont"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Ai deja cont?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Autentifica-te
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
