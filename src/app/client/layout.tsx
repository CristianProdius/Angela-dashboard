"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Scissors, CalendarDays, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { href: "/client/dashboard", label: "Programari", icon: CalendarDays },
  { href: "/client/book", label: "Programeaza", icon: Plus },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/client/auth/logout", { method: "POST" });
    } catch {
      toast.error("Eroare la deconectare");
    }
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            <span className="font-bold">Frizerie</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Iesire
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1 text-xs",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
