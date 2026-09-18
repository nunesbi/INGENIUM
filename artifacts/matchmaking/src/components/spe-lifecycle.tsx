import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Building, ShieldCheck, AlertCircle } from "lucide-react";

interface Asset {
  vgv?: number | null;
  percentualVendido?: number | null;
  equityAportado?: number | null;
  patrimonioAfetacao?: boolean | null;
  statusTerreno?: string | null;
  statusLicenciamento?: string | null;
  numUnidades?: number | null;
  cronogramaMeses?: number | null;
  mesesDecorridos?: number | null;
  tipoFunding?: string | null;
  incorporadora?: string | null;
}

const fmtBRL = (v: number) => {
  if (v >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  return `R$ ${(v / 1_000).toFixed(0)}K`;
};

export function SpeLifecyclePanel({ asset }: { asset: Asset }) {
  const cron = asset.cronogramaMeses ?? 0;
  const dec = asset.mesesDecorridos ?? 0;
  const cronPct = cron > 0 ? Math.min(100, Math.round((dec / cron) * 100)) : 0;
  const vendaPct = Math.max(0, Math.min(100, Math.round(asset.percentualVendido ?? 0)));
  const hasAnyLifecycle =
    asset.vgv != null || asset.numUnidades != null || asset.statusTerreno != null ||
    asset.statusLicenciamento != null || asset.cronogramaMeses != null;

  if (!hasAnyLifecycle) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <Building className="h-6 w-6 mx-auto mb-2 opacity-50" />
          Sem dados de SPE estruturada. Use o "Estruturar operação" pra preencher.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="spe-lifecycle-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4 text-brand" />
          Acompanhamento da SPE
        </CardTitle>
        <CardDescription className="text-xs mt-1">
          {asset.incorporadora ? `${asset.incorporadora} · ` : ""}
          {asset.tipoFunding ? `Funding ${asset.tipoFunding}` : "Operação em estruturação"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* VGV + % vendido */}
        {asset.vgv != null && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">VGV</div>
              <div className="text-xl font-bold font-mono tabular-nums">{fmtBRL(asset.vgv)}</div>
              {asset.equityAportado != null && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Equity: {fmtBRL(asset.equityAportado)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">% Vendido</span>
                <span className="text-xl font-bold font-mono tabular-nums">{vendaPct}%</span>
              </div>
              <Progress value={vendaPct} className="h-1.5" />
            </div>
          </div>
        )}

        {/* Cronograma */}
        {cron > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Cronograma
              </span>
              <span className="text-xs font-mono tabular-nums">{dec}/{cron} meses</span>
            </div>
            <Progress value={cronPct} className="h-1.5" />
            {cronPct > 80 && dec < cron && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Cronograma em fase final — atenção a entrega
              </p>
            )}
          </div>
        )}

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          {asset.numUnidades != null && (
            <div className="text-xs">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Unidades</div>
              <div className="font-mono tabular-nums">{asset.numUnidades}</div>
            </div>
          )}
          {asset.statusTerreno && (
            <div className="text-xs">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Terreno</div>
              <div className="font-medium">{asset.statusTerreno}</div>
            </div>
          )}
          {asset.statusLicenciamento && (
            <div className="text-xs">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Licenciamento</div>
              <div className="font-medium">{asset.statusLicenciamento}</div>
            </div>
          )}
          {asset.patrimonioAfetacao != null && (
            <div className="text-xs">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Pat. Afetação</div>
              {asset.patrimonioAfetacao ? (
                <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  <ShieldCheck className="h-3 w-3" /> Sim
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                  Não constituído
                </Badge>
              )}
            </div>
          )}
        </div>

        {vendaPct > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 pt-2 border-t border-border/50">
            <TrendingUp className="h-3.5 w-3.5" />
            VSO de {vendaPct}% — {vendaPct >= 30 ? "boa absorção pré-funding" : "absorção inicial"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
