import { WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-6 space-y-4">
          <WifiOff className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">Fara conexiune</h1>
          <p className="text-sm text-muted-foreground">
            Sunteti offline. Verificati conexiunea si incercati din nou.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
