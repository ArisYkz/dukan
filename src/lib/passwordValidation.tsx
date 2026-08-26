import { Check, Minus } from "lucide-react";

export interface PasswordRules {
  minLength: boolean;
  hasUppercase: boolean;
  hasDigit: boolean;
}

export function validatePassword(password: string): PasswordRules {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasDigit: /[0-9]/.test(password),
  };
}

export function isPasswordValid(rules: PasswordRules): boolean {
  return rules.minLength && rules.hasUppercase && rules.hasDigit;
}

interface RuleItem {
  key: string;
  label: string;
  met: boolean;
}

export function PasswordRulesChecklist({
  rules,
  labels,
}: {
  rules: PasswordRules;
  labels: { length: string; uppercase: string; digit: string };
}) {
  const items: RuleItem[] = [
    { key: "minLength", label: labels.length, met: rules.minLength },
    { key: "hasUppercase", label: labels.uppercase, met: rules.hasUppercase },
    { key: "hasDigit", label: labels.digit, met: rules.hasDigit },
  ];

  return (
    <div className="space-y-1 mt-2">
      {items.map((item) => (
        <div
          key={item.key}
          className={`flex items-center gap-2 text-xs transition-colors ${
            item.met ? "text-emerald-600" : "text-muted-foreground/50"
          }`}
        >
          {item.met ? (
            <Check className="w-3 h-3 shrink-0" />
          ) : (
            <Minus className="w-3 h-3 shrink-0" />
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
