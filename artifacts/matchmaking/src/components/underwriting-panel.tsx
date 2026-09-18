import { useGetAssetUnderwriting, getGetAssetUnderwritingQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, ShieldCheck, ShieldAlert, ShieldX, FileWarning } from "lucide-react";

interface Props { assetId: number; }

const recomendacaoConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; tone: string }> = {
  alta:        { label: "Pronto para underwriting", variant: "default",     icon: <ShieldCheck className="h-4 w-4" />, tone: "text-emerald-600 dark:text-emerald-400" },
  media:       { label: "Underwriting parcial",      variant: "secondary",   icon: <ShieldAlert className="h-4 w-4" />, tone: "text-amber-600 dark:text-amber-400" },
  baixa:       { label: "Não pronto",                variant: "destructive", icon: <ShieldX className="h-4 w-4" />,     tone: "text-red-600 dark:text-red-400" },
  indefinida:  { label: "Dados insuficientes",       variant: "outline",     icon: <FileWarning className="h-4 w-4" />, tone: "text-muted-foreground" },
};

const severidadeColor: Record<string, string> = {
  alta:  "border-l-red-500",
  media: "border-l-amber-500",
  baixa: "border-l-slate-400",
};

const categoriaLabel: Record<string, string> = {
  estrutura:   "Estrutura",
  financeiro:  "Financeiro",
  comercial:   "Comercial",
  documental:  "Documental",
};

export function UnderwritingPanel({ assetId }: Props) {
  const { data, isLoading } = useGetAssetUnderwriting(assetId, {
    query: { enabled: !!assetId, queryKey: getGetAssetUnderwritingQueryKey(assetId) },
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Underwriting</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  const rec = recomendacaoConfig[data.recomendacao];

  return (
    <Card data-testid="underwriting-panel">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Underwriting Institucional</CardTitle>
            <CardDescription className="text-xs mt-1">Prontidão da operação para captação estruturada</CardDescription>
          </div>
          <Badge variant={rec.variant} className="gap-1 whitespace-nowrap">
            {rec.icon}
            {rec.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Top-line scores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Readiness</span>
              <span className={`text-2xl font-bold tabular-nums ${rec.tone}`} data-testid="readiness-score">{data.readinessScore}</span>
            </div>
            <Progress value={data.readinessScore} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">Completude dos dados estruturados</p>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Compliance</span>
              <span className={`text-2xl font-bold tabular-nums ${rec.tone}`} data-testid="compliance-score">{data.complianceScore}</span>
            </div>
            <Progress value={data.complianceScore} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">Presença de sinais críticos</p>
          </div>
        </div>

        {/* Breakdown by category */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          {Object.entries(data.breakdown).map(([cat, b]) => {
            const bk = b as { score: number; max: number };
            const pct = bk.max > 0 ? Math.round((bk.score / bk.max) * 100) : 0;
            return (
              <div key={cat} className="border rounded-md px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{categoriaLabel[cat] ?? cat}</div>
                <div className="font-mono text-sm tabular-nums">{bk.score}<span className="text-muted-foreground text-xs">/{bk.max}</span></div>
                <Progress value={pct} className="h-1 mt-1" />
              </div>
            );
          })}
        </div>

        {/* Risk flags */}
        {data.riskFlags.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Sinais de risco estrutural
            </div>
            <ul className="space-y-1">
              {data.riskFlags.map((flag, i) => (
                <li key={i} className="text-xs text-amber-700 dark:text-amber-300 border-l-2 border-l-amber-500 pl-2 py-0.5">
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pendências */}
        {data.pendencias.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {data.pendencias.length} pendência{data.pendencias.length > 1 ? "s" : ""}
            </div>
            <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {data.pendencias.map((p, i) => (
                <li key={i} className={`text-xs flex items-center justify-between border-l-2 ${severidadeColor[p.severidade]} pl-2 py-1`}>
                  <span>{p.descricao}</span>
                  <Badge variant="outline" className="ml-2 text-[10px] uppercase">{p.severidade}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Nenhuma pendência estrutural
          </div>
        )}
      </CardContent>
    </Card>
  );
}
