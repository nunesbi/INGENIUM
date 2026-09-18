import { Check, X } from "lucide-react";

export interface PasswordRule {
  id: string;
  label: string;
  required: boolean;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "len",     label: "Mínimo 8 caracteres",          required: true,  test: (p) => p.length >= 8 },
  { id: "lower",   label: "Uma letra minúscula (a-z)",     required: true,  test: (p) => /[a-z]/.test(p) },
  { id: "upper",   label: "Uma letra maiúscula (A-Z)",     required: true,  test: (p) => /[A-Z]/.test(p) },
  { id: "digit",   label: "Um número (0-9)",               required: true,  test: (p) => /\d/.test(p) },
  { id: "symbol",  label: "Um símbolo (!@#$…) — recomendado", required: false, test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function isPasswordStrong(pw: string): boolean {
  return PASSWORD_RULES.filter((r) => r.required).every((r) => r.test(pw));
}

export function passwordStrength(pw: string): { score: 0|1|2|3|4; label: string; color: string } {
  const passed = PASSWORD_RULES.filter((r) => r.test(pw)).length;
  if (pw.length === 0) return { score: 0, label: "—", color: "bg-muted" };
  if (passed <= 1) return { score: 1, label: "Fraca", color: "bg-red-500" };
  if (passed === 2) return { score: 2, label: "Regular", color: "bg-orange-500" };
  if (passed === 3 || passed === 4) return { score: 3, label: "Boa", color: "bg-amber-500" };
  return { score: 4, label: "Forte", color: "bg-emerald-500" };
}

export function PasswordChecklist({ password }: { password: string }) {
  const strength = passwordStrength(password);
  return (
    <div className="space-y-2.5 mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${strength.color}`}
            style={{ width: `${(strength.score / 4) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-14 text-right" data-testid="password-strength-label">
          {strength.label}
        </span>
      </div>
      <ul className="space-y-1">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          const Icon = ok ? Check : X;
          const color = ok
            ? "text-emerald-600 dark:text-emerald-400"
            : r.required
              ? "text-muted-foreground"
              : "text-muted-foreground/70";
          return (
            <li key={r.id} className={`flex items-center gap-2 text-xs ${color}`} data-testid={`pw-rule-${r.id}`}>
              <Icon size={12} className="flex-shrink-0" />
              <span>
                {r.label}
                {!r.required && <span className="text-muted-foreground/60 ml-1">(opcional)</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
