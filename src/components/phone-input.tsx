"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const COUNTRY_CODES = [
  { code: "373", label: "🇲🇩 +373", country: "Moldova" },
  { code: "40", label: "🇷🇴 +40", country: "Romania" },
  { code: "380", label: "🇺🇦 +380", country: "Ucraina" },
  { code: "7", label: "🇷🇺 +7", country: "Rusia" },
  { code: "49", label: "🇩🇪 +49", country: "Germania" },
  { code: "39", label: "🇮🇹 +39", country: "Italia" },
  { code: "44", label: "🇬🇧 +44", country: "UK" },
  { code: "1", label: "🇺🇸 +1", country: "SUA" },
];

function detectCountryCode(fullPhone: string): { code: string; local: string } {
  // Try to match longest country codes first
  const sorted = [...COUNTRY_CODES].sort(
    (a, b) => b.code.length - a.code.length
  );
  for (const cc of sorted) {
    if (fullPhone.startsWith(cc.code)) {
      return { code: cc.code, local: fullPhone.slice(cc.code.length) };
    }
  }
  // Default to Moldova
  return { code: "373", local: fullPhone };
}

interface PhoneInputProps {
  value: string; // full digits: "37369123456"
  onChange: (fullPhone: string) => void;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, placeholder }: PhoneInputProps) {
  const { code, local } = detectCountryCode(value);

  const handleCodeChange = (newCode: string) => {
    onChange(newCode + local);
  };

  const handleLocalChange = (newLocal: string) => {
    const digits = newLocal.replace(/\D/g, "");
    onChange(code + digits);
  };

  return (
    <div className="flex gap-2">
      <Select value={code} onValueChange={handleCodeChange}>
        <SelectTrigger className="w-[120px] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((cc) => (
            <SelectItem key={cc.code} value={cc.code}>
              {cc.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={local}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder={placeholder || "69123456"}
        className="flex-1"
      />
    </div>
  );
}
