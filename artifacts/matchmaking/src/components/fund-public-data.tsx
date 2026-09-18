import { useEffect, useState } from "react";
import {
  useGetFundPublicData,
  useSyncFundsFromCvm,
  useExtractFundProfile,
  useDiscoverFundRelatorio,
  getGetFundPublicDataQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  RefreshCw,
  Users,
  DollarSign,
  TrendingUp,
  Percent,
  FileText,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Search,
} from "lucide-react";

function formatCurrencyBRL(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n);
}

function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(2)}%`;
}

function formatMonth(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  } catch { return iso; }
}

interface Props {
  fundId: number;
  hasCnpj: boolean;
}

export function FundPublicDataPanel({ fundId, hasCnpj }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfUrlInitialized, setPdfUrlInitialized] = useState(false);

  const { data, isLoading } = useGetFundPublicData(fundId, {
    query: { enabled: !!fundId, queryKey: getGetFundPublicDataQueryKey(fundId) },
  });

  // Pre-fill input with stored URL once data loads
  useEffect(() => {
    if (!pdfUrlInitialized && data?.relatorioPdfUrl) {
      setPdfUrl(data.relatorioPdfUrl);
      setPdfUrlInitialized(true);
    }
  }, [data?.relatorioPdfUrl, pdfUrlInitialized]);

  const syncMutation = useSyncFundsFromCvm();
  const extractMutation = useExtractFundProfile();
  const discoverMutation = useDiscoverFundRelatorio();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetFundPublicDataQueryKey(fundId) });

  const handleSync = () => {
    syncMutation.mutate(undefined as never, {
      onSuccess: (result) => {
        const r = result as { rowsUpserted?: number; status?: string; errors?: string[] };
        toast({
          title: "Sincronização CVM concluída",
          description: `${r.rowsUpserted ?? 0} linhas atualizadas (status: ${r.status ?? "?"})${r.errors?.length ? ". Erros: " + r.errors.join("; ") : ""}`,
        });
        invalidate();
      },
      onError: (err) => toast({ title: "Erro ao sincronizar", description: String(err), variant: "destructive" }),
    });
  };

  const handleExtract = () => {
    // Empty URL = auto-discover via CVM Fundos.NET on the server
    const body = pdfUrl.trim() ? { pdfUrl: pdfUrl.trim() } : {};
    extractMutation.mutate(
      { id: fundId, data: body },
      {
        onSuccess: (resp) => {
          const r = resp as { discoveredUrl?: string | null; dataReferencia?: string | null };
          if (r.discoveredUrl) {
            setPdfUrl(r.discoveredUrl);
            toast({
              title: "Perfil extraído via CVM Fundos.NET",
              description: r.dataReferencia ? `Relatório de referência ${r.dataReferencia}` : undefined,
            });
          } else {
            toast({ title: "Perfil extraído com sucesso" });
          }
          invalidate();
        },
        onError: (err) => toast({ title: "Falha ao extrair perfil", description: String(err), variant: "destructive" }),
      },
    );
  };

  const handleDiscover = () => {
    discoverMutation.mutate(
      { id: fundId },
      {
        onSuccess: (resp) => {
          const r = resp as { url: string; dataReferencia: string };
          setPdfUrl(r.url);
          toast({
            title: "Relatório encontrado no CVM Fundos.NET",
            description: `Referência: ${r.dataReferencia}`,
          });
          invalidate();
        },
        onError: (err) => toast({ title: "Não encontrou no FNET", description: String(err), variant: "destructive" }),
      },
    );
  };

  if (!hasCnpj) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Dados públicos não disponíveis
          </CardTitle>
          <CardDescription>
            Cadastre o <strong>CNPJ</strong> do fundo (botão Editar acima) para habilitar a sincronização
            automática com a CVM e a extração do perfil via relatório gerencial.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const latest = data.latest;
  const qualitative = data.qualitative;
  const history = data.history ?? [];

  return (
    <div className="space-y-6">
      {/* Header & actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            Dados públicos (CVM)
          </h2>
          <p className="text-sm text-muted-foreground">
            Atualização automática diária a partir do informe mensal da CVM. CNPJ rastreado: <span className="font-mono">{data.cnpj}</span>
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncMutation.isPending} size="sm" variant="outline" className="gap-2">
          <RefreshCw size={14} className={syncMutation.isPending ? "animate-spin" : ""} />
          Sincronizar agora
        </Button>
      </div>

      {/* Latest metrics */}
      {!latest ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Nenhum informe encontrado ainda para este CNPJ. Clique em <em>Sincronizar agora</em> — se o CNPJ for de um FII registrado na CVM, os dados aparecerão aqui.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={<Users className="h-4 w-4" />} label="Nº de cotistas" value={formatInt(latest.numCotistas)} />
          <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Patrimônio líquido" value={formatCurrencyBRL(latest.patrimonioLiquido)} />
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Valor patrimonial da cota" value={formatCurrencyBRL(latest.valorPatrimonialCota)} />
          <MetricCard icon={<Percent className="h-4 w-4" />} label="Dividend yield (mês)" value={formatPct(latest.dividendYieldMes)} />
        </div>
      )}

      {latest && (
        <p className="text-xs text-muted-foreground -mt-2">
          Referência: {formatMonth(latest.dataReferencia)} · Maior cotista: {formatPct(latest.percentualMaiorCotista)}
          {latest.sourceUrl && (
            <> · <a href={latest.sourceUrl} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">fonte CVM <ExternalLink size={10} /></a></>
          )}
        </p>
      )}

      {/* History chart */}
      {history.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Valor patrimonial da cota — últimos meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={history.map((h) => ({
                  mes: formatMonth(h.dataReferencia),
                  cota: h.valorPatrimonialCota,
                  dy: h.dividendYieldMes,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="mes" fontSize={11} tickMargin={6} />
                  <YAxis fontSize={11} width={70} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: unknown) => (typeof v === "number" ? formatCurrencyBRL(v) : "—")}
                  />
                  <Line type="monotone" dataKey="cota" stroke="hsl(var(--brand))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Qualitative profile */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                Perfil qualitativo (relatório gerencial)
              </CardTitle>
              <CardDescription>
                Extraído via IA a partir do PDF do relatório gerencial mais recente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {qualitative ? (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <ProfileRow label="Perfil de risco" value={qualitative.perfilRisco} />
              <ProfileRow label="Foco" value={qualitative.focoRendaCrescimento} />
              <ProfileRow label="Tipo de cotista desejado" value={qualitative.tipoCotistaDesejado} />
              <ProfileRow label="Preocupação com volatilidade" value={qualitative.preocupacaoVolatilidade} />
              <div className="md:col-span-2">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Estratégia</dt>
                <dd className="leading-relaxed">{qualitative.estrategia || "—"}</dd>
              </div>
              {qualitative.palavrasChave && qualitative.palavrasChave.length > 0 && (
                <div className="md:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Palavras-chave</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {qualitative.palavrasChave.map((k: string) => (
                      <Badge key={k} variant="secondary">{k}</Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum perfil extraído ainda. Clique em <em>Extrair perfil</em> abaixo — buscaremos o
              relatório gerencial mais recente direto do CVM Fundos.NET pelo CNPJ.
            </p>
          )}

          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Deixe vazio para auto-descobrir o relatório mais recente no CVM Fundos.NET, ou cole uma URL específica.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="(vazio = auto-descobrir via CVM Fundos.NET)"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                className="flex-1 font-mono text-xs"
              />
              <Button onClick={handleDiscover} disabled={discoverMutation.isPending} variant="outline" className="gap-2">
                <Search size={14} className={discoverMutation.isPending ? "animate-pulse" : ""} />
                {discoverMutation.isPending ? "Buscando..." : "Buscar no FNET"}
              </Button>
              <Button onClick={handleExtract} disabled={extractMutation.isPending} className="gap-2">
                <Sparkles size={14} className={extractMutation.isPending ? "animate-pulse" : ""} />
                {extractMutation.isPending ? "Extraindo..." : "Extrair perfil via IA"}
              </Button>
            </div>
            {pdfUrl && (
              <p className="text-xs">
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-brand underline inline-flex items-center gap-1">
                  Abrir documento <ExternalLink size={10} />
                </a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Offerings */}
      {data.offerings && data.offerings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ofertas / Prospectos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border/50">
              {data.offerings.map((o) => (
                <li key={o.id} className="py-3 text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="font-medium">{o.codigoOferta || "Oferta"}</div>
                  <div className="text-muted-foreground">{o.publicoAlvo || "Público-alvo não informado"}</div>
                  <div className="font-mono">{formatCurrencyBRL(o.valorTotal)}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
          {icon} {label}
        </div>
        <div className="text-xl font-bold font-mono tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
