import {
  useGetNetworkSummary,
  useListIncorporadoras,
  useListEmpreendedores,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Building2, Users, Briefcase, MapPin, TrendingUp, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useState } from "react";

export default function Rede() {
  const { data: summary, isLoading: loadingSummary } = useGetNetworkSummary();
  const { data: incorps, isLoading: loadingIncorps } = useListIncorporadoras();
  const { data: emps, isLoading: loadingEmps } = useListEmpreendedores();

  const [tab, setTab] = useState<"incorporadoras" | "empreendedores">("incorporadoras");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Rede Ingenium"
        description="Densidade da nossa base de incorporadoras, empreendedores e operações monitoradas em tempo real."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Incorporadoras cadastradas"
          value={summary?.totalIncorporadoras}
          icon={Building2}
          accent="text-emerald-400"
          isLoading={loadingSummary}
        />
        <KpiCard
          title="Empreendedores monitorados"
          value={summary?.totalEmpreendedores}
          icon={Users}
          accent="text-sky-400"
          isLoading={loadingSummary}
        />
        <KpiCard
          title="Operações registradas"
          value={summary?.totalOperacoes}
          icon={Briefcase}
          accent="text-brand"
          isLoading={loadingSummary}
        />
        <KpiCard
          title="VGV histórico mapeado"
          value={summary?.vgvHistoricoTotal != null ? formatCurrency(summary.vgvHistoricoTotal) : undefined}
          icon={TrendingUp}
          accent="text-amber-400"
          isLoading={loadingSummary}
        />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin size={16} className="text-brand" /> Concentração por estado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {loadingSummary && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            {summary?.porEstado?.slice(0, 12).map((r) => {
              const max = summary.porEstado[0]?.total ?? 1;
              const pct = Math.max(8, Math.round((r.total / max) * 100));
              return (
                <div key={r.estado} className="flex items-center gap-3 text-sm">
                  <span className="w-10 font-mono text-xs text-muted-foreground">{r.estado}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full bg-brand/70 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-medium tabular-nums">{r.total}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity size={16} className="text-brand" /> Foco por segmento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {loadingSummary && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            {summary?.porSegmento?.slice(0, 12).map((r) => {
              const max = summary.porSegmento[0]?.total ?? 1;
              const pct = Math.max(8, Math.round((r.total / max) * 100));
              return (
                <div key={r.segmento} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate text-xs text-muted-foreground">{r.segmento}</span>
                  <div className="w-32 h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-medium tabular-nums">{r.total}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Base monitorada</CardTitle>
          <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
            <button
              onClick={() => setTab("incorporadoras")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "incorporadoras" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-incorporadoras"
            >
              Incorporadoras
            </button>
            <button
              onClick={() => setTab("empreendedores")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "empreendedores" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-empreendedores"
            >
              Empreendedores
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {tab === "incorporadoras" ? (
            <div className="divide-y divide-border/50">
              {loadingIncorps && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 my-2" />)}
              {incorps?.slice(0, 50).map((i) => (
                <div key={i.id} className="flex items-center gap-4 py-3" data-testid={`row-incorporadora-${i.id}`}>
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{i.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {i.cidade}/{i.estado} · {i.segmentoFoco} · {i.anosAtuacao} anos
                    </div>
                  </div>
                  <div className="hidden sm:flex gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Activity size={10} /> {i.opsAtivas} ativas
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {i.opsEntregues} entregues
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {loadingEmps && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 my-2" />)}
              {emps?.slice(0, 50).map((e) => (
                <div key={e.id} className="flex items-center gap-4 py-3" data-testid={`row-empreendedor-${e.id}`}>
                  <div className="w-9 h-9 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                    {e.nome.split(" ").map(p => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {e.cargo} · {e.incorporadoraNome ?? "—"} · {e.cidade}/{e.estado}
                    </div>
                  </div>
                  <div className="hidden sm:flex gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {e.anosExperiencia} anos
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {e.opsEntregues} ops
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pt-2">
        Base proprietária da Ingenium — atualizada continuamente conforme novas incorporadoras se cadastram na plataforma.
      </p>
    </div>
  );
}

function KpiCard({
  title, value, icon: Icon, accent = "text-brand", isLoading,
}: { title: string; value: number | string | undefined; icon: any; accent?: string; isLoading?: boolean }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl bg-card flex items-center justify-center ${accent} bg-current/10`}>
          <Icon size={20} className={accent} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{title}</div>
          {isLoading || value === undefined ? (
            <Skeleton className="h-7 w-20 mt-1" />
          ) : (
            <div className="text-2xl font-bold tabular-nums tracking-tight mt-0.5">
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
