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

export default function ClientLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("373");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/client/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Eroare la autentificare");
        return;
      }

      router.push("/client/dashboard");
    } catch {
      toast.error("Eroare la autentificare");
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
          <CardTitle className="text-2xl">Autentificare</CardTitle>
          <p className="text-sm text-muted-foreground">
            Intra in contul tau pentru a gestiona programarile
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Parola ta"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Se autentifica..." : "Intra"}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <Link
              href="/client/forgot-password"
              className="text-sm text-muted-foreground hover:underline block"
            >
              Ai uitat parola?
            </Link>
            <p className="text-sm text-muted-foreground">
              Nu ai cont?{" "}
              <Link href="/client/register" className="text-primary hover:underline">
                Inregistreaza-te
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
