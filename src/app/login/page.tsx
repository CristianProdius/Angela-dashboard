"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneInput } from "@/components/phone-input";
import { Scissors } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [phone, setPhone] = useState("373");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, try unified login to determine role
      const res = await fetch("/api/auth/unified-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Eroare la autentificare");
        setLoading(false);
        return;
      }

      if (data.role === "admin") {
        // Create NextAuth session for admin
        const result = await signIn("credentials", {
          phone,
          password,
          redirect: false,
        });

        if (result?.error) {
          toast.error("Eroare la autentificare admin");
          setLoading(false);
          return;
        }

        router.push("/dashboard");
      } else {
        // Full page load to ensure the Set-Cookie header is applied
        window.location.href = "/client/dashboard";
      }
    } catch {
      toast.error("Eroare la autentificare");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Scissors className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Frizerie</CardTitle>
          <p className="text-sm text-muted-foreground">
            Autentifica-te pentru a continua
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Telefon</Label>
              <PhoneInput value={phone} onChange={setPhone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parola</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parola ta"
                required
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
