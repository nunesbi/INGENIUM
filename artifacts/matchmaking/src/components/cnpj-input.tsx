import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

export interface CnpjLookupResult {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacao: string;
  situacaoOk: boolean;
  municipio: string | null;
  uf: string | null;
  porte: string | null;
  cnae: string | null;
}

export function formatCnpj(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: CnpjLookupResult }
  | { status: "error"; message: string };

/**
 * CNPJ field with real-time Receita Federal lookup via BrasilAPI proxy.
 *
 * On `value` change with 14 digits, debounces 600ms then fetches /api/cnpj/:digits.
 * Shows razão social / situação cadastral, blocks submission when CNPJ is invalid
 * (parent should disable submit while `state.status !== 'ok'`).
 */
export function CnpjInput({
  value,
  onChange,
  onResolved,
  required,
  testid,
  label = "CNPJ",
}: {
  value: string;
  onChange: (formatted: string) => void;
  onResolved?: (result: CnpjLookupResult | null) => void;
  required?: boolean;
  testid?: string;
  label?: string;
}) {
  const [state, setState] = useState<State>({ status: "idle" });

  const digits = value.replace(/\D/g, "");

  useEffect(() => {
    if (digits.length !== 14) {
      setState({ status: "idle" });
      onResolved?.(null);
      return;
    }
    setState({ status: "loading" });
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cnpj/${digits}`, {
          credentials: "include",
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Erro" }));
          setState({ status: "error", message: body.error ?? "CNPJ inválido" });
          onResolved?.(null);
          return;
        }
        const data = (await res.json()) as CnpjLookupResult;
        setState({ status: "ok", data });
        onResolved?.(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({ status: "error", message: "Falha ao consultar." });
        onResolved?.(null);
      }
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  return (
    <div className="space-y-2">
      <Label htmlFor="cnpj" className="flex items-center gap-1.5">
        {label}
        {required && <span className="text-destructive">*</span>}
        <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
          <ShieldCheck size={11} /> validação Receita Federal
        </span>
      </Label>
      <div className="relative">
        <Input
          id="cnpj"
          inputMode="numeric"
          placeholder="00.000.000/0001-00"
          value={value}
          onChange={(e) => onChange(formatCnpj(e.target.value))}
          data-testid={testid ?? "input-cnpj"}
          className={
            state.status === "ok"
              ? "border-emerald-500/60 pr-10"
              : state.status === "error"
                ? "border-destructive pr-10"
                : "pr-10"
          }
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {state.status === "loading" && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
          {state.status === "ok" && <CheckCircle2 size={16} className="text-emerald-500" />}
          {state.status === "error" && <AlertCircle size={16} className="text-destructive" />}
        </span>
      </div>

      {state.status === "ok" && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs space-y-0.5" data-testid="cnpj-result">
          <div className="font-semibold text-foreground">{state.data.razaoSocial}</div>
          {state.data.nomeFantasia && (
            <div className="text-muted-foreground">Nome fantasia: {state.data.nomeFantasia}</div>
          )}
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className={state.data.situacaoOk ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-orange-600 dark:text-orange-400 font-medium"}>
              {state.data.situacao}
            </span>
            {state.data.municipio && state.data.uf && (
              <span>{state.data.municipio}/{state.data.uf}</span>
            )}
            {state.data.porte && <span>{state.data.porte}</span>}
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="text-xs text-destructive flex items-center gap-1.5" data-testid="cnpj-error">
          <AlertCircle size={12} /> {state.message}
        </div>
      )}

      {digits.length > 0 && digits.length < 14 && (
        <div className="text-xs text-muted-foreground">{digits.length}/14 dígitos</div>
      )}
    </div>
  );
}
