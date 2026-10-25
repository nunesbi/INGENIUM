import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowRight,
  Building2,
  Landmark,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatPercent } from "@/lib/format";

type InterestStatus = "pendente" | "aprovado" | "rejeitado";

type Interest = {
  id: number;
  fundoId: number;
  ativoId: number;
  status: InterestStatus;
  createdAt: string;
  fundo: {
    id: number;
    nome: string;
    tese: string;
    ticketMin: string | number;
    ticketMax: string | number;
    segmentos: string[];
    regioes: string[];
    nivelRisco: string;
    roiMinimo: string | number;
    descricao?: string | null;
    estagio: string;
    cnpj?: string | null;
  };
  ativo: {
    id: number;
    nome: string;
    tipoAtivo: string;
    regiao: string;
    estagio: string;
    valorCaptacao: string | number;
    roiPrevisto: string | number;
    prazo?: number | null;
    descricao?: string | null;
  };
};

function statusLabel(status: InterestStatus) {
  switch (status) {
    case "aprovado":
      return "Aprovado";
    case "rejeitado":
      return "Rejeitado";
    default:
      return "Pendente";
  }
}

function statusClass(status: InterestStatus) {
  switch (status) {
    case "aprovado":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "rejeitado":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  }
}

function StatusIcon({ status }: { status: InterestStatus }) {
  if (status === "aprovado") {
    return <CheckCircle2 size={14} />;
  }

  if (status === "rejeitado") {
    return <XCircle size={14} />;
  }

  return <Clock3 size={14} />;
}

export default function AdminInteresses() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<"todos" | InterestStatus>("todos");

  const { toast } = useToast();

  const loadInterests = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/interests", {
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível carregar as manifestações.",
        );
      }

      setInterests(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: "Erro ao carregar manifestações",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInterests();
  }, []);

  const filteredInterests =
    statusFilter === "todos"
      ? interests
      : interests.filter((interest) => interest.status === statusFilter);

  const pendingCount = interests.filter(
    (interest) => interest.status === "pendente",
  ).length;

  const approvedCount = interests.filter(
    (interest) => interest.status === "aprovado",
  ).length;

  const rejectedCount = interests.filter(
    (interest) => interest.status === "rejeitado",
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            Curadoria da Ingenium
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Manifestações de interesse
          </h1>

          <p className="text-muted-foreground mt-2 max-w-2xl">
            Analise os interesses manifestados pelos fundos antes de liberar
            uma conexão com a operação.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => loadInterests(true)}
          disabled={refreshing}
          className="gap-2 shrink-0"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Atualizar
        </Button>
      </div>

      {/* RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Total
            </p>

            <p className="text-2xl font-bold mt-1">
              {loading ? "—" : interests.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Pendentes
            </p>

            <p className="text-2xl font-bold mt-1 text-amber-600">
              {loading ? "—" : pendingCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Aprovadas
            </p>

            <p className="text-2xl font-bold mt-1 text-green-600">
              {loading ? "—" : approvedCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Rejeitadas
            </p>

            <p className="text-2xl font-bold mt-1 text-red-600">
              {loading ? "—" : rejectedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["todos", "Todas"],
          ["pendente", "Pendentes"],
          ["aprovado", "Aprovadas"],
          ["rejeitado", "Rejeitadas"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={statusFilter === value ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setStatusFilter(value as "todos" | InterestStatus)
            }
          >
            {label}
          </Button>
        ))}
      </div>

      {/* LISTA */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-base">
            Solicitações para análise
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="border border-border/60 rounded-xl p-5 space-y-4"
                >
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-80" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : filteredInterests.length === 0 ? (
            <div className="py-16 text-center">
              <Clock3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />

              <h3 className="font-medium">
                Nenhuma manifestação encontrada
              </h3>

              <p className="text-sm text-muted-foreground mt-1">
                Não existem solicitações para o filtro selecionado.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredInterests.map((interest) => (
                <div
                  key={interest.id}
                  className="p-5 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center gap-5">
                    {/* IDENTIFICAÇÃO */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge
                          variant="outline"
                          className={statusClass(interest.status)}
                        >
                          <StatusIcon status={interest.status} />
                          {statusLabel(interest.status)}
                        </Badge>

                        <span className="text-xs text-muted-foreground font-mono">
                          #{interest.id}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {new Date(interest.createdAt).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* FUNDO */}
                        <div className="rounded-lg border border-border/60 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Landmark
                              size={16}
                              className="text-brand"
                            />

                            <span className="text-xs uppercase tracking-wider text-muted-foreground">
                              Fundo
                            </span>
                          </div>

                          <p className="font-semibold truncate">
                            {interest.fundo.nome}
                          </p>

                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {interest.fundo.tese || "Tese não informada"}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-3 text-xs">
                            <span className="px-2 py-1 rounded bg-muted">
                              Ticket{" "}
                              {formatCurrency(
                                interest.fundo.ticketMin || 0,
                              )}{" "}
                              –{" "}
                              {formatCurrency(
                                interest.fundo.ticketMax || 0,
                              )}
                            </span>

                            <span className="px-2 py-1 rounded bg-muted">
                              ROI mín.{" "}
                              {formatPercent(interest.fundo.roiMinimo)}
                            </span>
                          </div>
                        </div>

                        {/* ATIVO */}
                        <div className="rounded-lg border border-border/60 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2
                              size={16}
                              className="text-brand"
                            />

                            <span className="text-xs uppercase tracking-wider text-muted-foreground">
                              Operação
                            </span>
                          </div>

                          <p className="font-semibold truncate">
                            {interest.ativo.nome}
                          </p>

                          <p className="text-sm text-muted-foreground mt-1">
                            {interest.ativo.tipoAtivo} ·{" "}
                            {interest.ativo.regiao}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-3 text-xs">
                            <span className="px-2 py-1 rounded bg-muted">
                              Captação{" "}
                              {formatCurrency(
                                interest.ativo.valorCaptacao || 0,
                              )}
                            </span>

                            <span className="px-2 py-1 rounded bg-muted">
                              ROI{" "}
                              {formatPercent(
                                interest.ativo.roiPrevisto,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AÇÃO */}
                    <div className="xl:w-40 shrink-0">
                      <Button
                        asChild
                        className="w-full gap-2 bg-brand text-white hover:bg-brand/90"
                      >
                        <Link href={`/admin/interesses/${interest.id}`}>
                          Analisar
                          <ArrowRight size={15} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}