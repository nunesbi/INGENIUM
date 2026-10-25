import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";

interface Suggestion {
  titulo: string;
  porQue: string;
  categoria: "estrutura" | "comercial" | "documental" | "financeiro";
  impacto: "alto" | "medio" | "baixo";
}

interface Result {
  resumo: string;
  sugestoes: Suggestion[];
}

const impactoColor: Record<string, string> = {
  alto: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  medio: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  baixo: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

const categoriaLabel: Record<string, string> = {
  estrutura: "Estrutura",
  comercial: "Comercial",
  documental: "Documental",
  financeiro: "Financeiro",
};

export function CopilotSuggestionsPanel({ assetId }: { assetId: number }) {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/assets/${assetId}/copilot-suggestions`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as Result;
      setData(json);
    } catch (e) {
      setError("Não consegui gerar sugestões agora. Tenta de novo em um instante.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-brand/20 bg-gradient-to-br from-brand/5 to-transparent" data-testid="copilot-suggestions-panel">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              Copilot — tornar a operação investível
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Sugestões práticas do Copilot Ingenium sobre o que mexer agora pra deixar a operação pronta pra fundo.
            </CardDescription>
          </div>
          {!data && (
            <Button onClick={generate} disabled={loading} size="sm" className="bg-brand text-white hover:bg-brand/90 shrink-0">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? "Analisando" : "Gerar sugestões"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && !data && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {data && (
          <div className="space-y-4">
            <p className="text-sm italic text-foreground/80 border-l-2 border-brand/40 pl-3 py-1">
              "{data.resumo}"
            </p>
            <ul className="space-y-2.5">
              {data.sugestoes.map((s, i) => (
                <li key={i} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-start gap-2 mb-1">
                    <Lightbulb className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                    <p className="text-sm font-semibold flex-1">{s.titulo}</p>
                    <Badge variant="outline" className={`text-[10px] uppercase ${impactoColor[s.impacto]}`}>
                      {s.impacto}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5">{s.porQue}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 ml-5 mt-1.5">
                    {categoriaLabel[s.categoria] ?? s.categoria}
                  </p>
                </li>
              ))}
            </ul>
            <Button onClick={generate} disabled={loading} variant="outline" size="sm" className="w-full">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              Recalcular
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
