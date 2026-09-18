import { useParams, Link, useLocation } from "wouter";
import {
  useGetAsset,
  useGetMatchesForAsset,
  useUpdateAsset,
  useDeleteAsset,
  useRunMatching,
  getGetAssetQueryKey,
  getGetMatchesForAssetQueryKey,
  getListMatchesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  formatCurrency,
  formatPercent,
  getScoreColor,
  formatScore,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AssetForm } from "@/components/asset-form";
import { UnderwritingPanel } from "@/components/underwriting-panel";
import { CopilotSuggestionsPanel } from "@/components/copilot-suggestions-panel";
import { SpeLifecyclePanel } from "@/components/spe-lifecycle";
import {
  ArrowLeft,
  Building,
  FileText,
  TrendingUp,
  Clock,
  Calendar,
  MapPin,
  Target,
  ArrowRight,
  Pencil,
  Trash2,
  Zap,
  ShieldCheck,
  ChevronDown,
  Heart,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const assetId = parseInt(id, 10);
  const { user } = useAuth();

  const {
    data: asset,
    isLoading: isAssetLoading,
  } = useGetAsset(assetId, {
    query: {
      enabled: !!assetId,
      queryKey: getGetAssetQueryKey(assetId),
    },
  });

  const isAtivoRole = user?.role === "ativo";
  const isFundoRole = user?.role === "fundo";
  const isAdminRole = user?.role === "admin";

  /*
   * Matches continuam disponíveis para ativos/admin.
   * Fundo NÃO consulta os matches dessa operação.
   */
  const {
    data: matches,
    isLoading: isMatchesLoading,
  } = useGetMatchesForAsset(assetId, {
    query: {
      enabled: !!assetId && !isFundoRole,
      queryKey: getGetMatchesForAssetQueryKey(assetId),
    },
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestSubmitted, setInterestSubmitted] = useState(false);

  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const runMatching = useRunMatching();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  /*
   * Verifica se o fundo já manifestou interesse nessa operação.
   */
useEffect(() => {
  if (!isFundoRole || !assetId) return;

  let cancelled = false;

  fetch(`/api/interests/asset/${assetId}`, {
    method: "GET",
    credentials: "include",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      return response.json();
    })
 .then((interest) => {
  if (!cancelled && Array.isArray(interest) && interest.length > 0) {
    setInterestSubmitted(true);
  }
})
    .catch(() => {
      // Mantém o botão disponível caso a consulta falhe.
    });

  return () => {
    cancelled = true;
  };
}, [isFundoRole, assetId]);

  const handleInterest = async () => {
    if (interestLoading || interestSubmitted) return;

    setInterestLoading(true);

    try {
      const response = await fetch("/api/interests", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ativoId: assetId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível manifestar interesse.",
        );
      }

      setInterestSubmitted(true);

      toast({
        title: "Interesse manifestado",
        description:
          "Seu interesse nesta operação foi registrado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao manifestar interesse",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setInterestLoading(false);
    }
  };

  const handleUpdate = (data: any) => {
    updateAsset.mutate(
      { id: assetId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetAssetQueryKey(assetId),
          });

          setSheetOpen(false);

          toast({
            title: "Asset updated successfully",
          });
        },
        onError: (err) => {
          toast({
            title: "Error updating asset",
            description: String(err),
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this asset? This action cannot be undone.",
      )
    ) {
      deleteAsset.mutate(
        { id: assetId },
        {
          onSuccess: () => {
            toast({
              title: "Asset deleted",
            });

            setLocation("/assets");
          },
          onError: (err) => {
            toast({
              title: "Error deleting asset",
              description: String(err),
              variant: "destructive",
            });
          },
        },
      );
    }
  };

  const handleRunMatch = () => {
    runMatching.mutate(
      {
        data: {
          ativoId: assetId,
          generateAI: false,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetMatchesForAssetQueryKey(assetId),
          });

          queryClient.invalidateQueries({
            queryKey: getListMatchesQueryKey(),
          });

          toast({
            title: "Matching completed",
            description:
              "Found compatible funds for this asset.",
          });
        },
        onError: (err) => {
          toast({
            title: "Error running match",
            description: String(err),
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isAssetLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-20">
        <Building className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />

        <h2 className="text-2xl font-semibold mb-2">
          Asset Not Found
        </h2>

        <p className="text-muted-foreground mb-6">
          The project you're looking for doesn't exist or has been removed.
        </p>

        <Button asChild>
          <Link href="/assets">
            Back to Assets
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* VOLTAR */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/assets"
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          Voltar para operações
        </Link>
      </div>

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {asset.nome}
          </h1>

          <div className="flex items-center gap-3 mt-2">
            <Badge
              variant="secondary"
              className="bg-muted text-muted-foreground hover:bg-muted font-medium"
            >
              {asset.tipoAtivo}
            </Badge>

            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={14} />
              {asset.regiao}
            </span>
          </div>
        </div>

        {/* AÇÕES DO ATIVO / ADMIN */}
        {!isFundoRole && (
          <div className="flex items-center gap-2">

            <Button
              onClick={handleRunMatch}
              disabled={runMatching.isPending}
              className="gap-2 bg-brand text-white hover:bg-brand/90"
            >
              {runMatching.isPending ? (
                <Zap
                  size={16}
                  className="animate-pulse"
                />
              ) : (
                <Zap size={16} />
              )}

              Run Matching Engine
            </Button>

            <Sheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
            >
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                >
                  <Pencil size={16} />
                </Button>
              </SheetTrigger>

              <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle>
                    Edit Asset
                  </SheetTitle>

                  <SheetDescription>
                    Update the details for this project.
                  </SheetDescription>
                </SheetHeader>

                <AssetForm
                  initialData={asset}
                  onSubmit={handleUpdate}
                  isLoading={updateAsset.isPending}
                />
              </SheetContent>
            </Sheet>

            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              disabled={deleteAsset.isPending}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}

        {/* BOTÃO DO FUNDO */}
        {isFundoRole && (
          <Button
            onClick={handleInterest}
            disabled={interestLoading || interestSubmitted}
            className="gap-2 bg-brand text-white hover:bg-brand/90"
          >
            {interestSubmitted ? (
              <>
                <CheckCircle2 size={16} />
                Interesse enviado
              </>
            ) : (
              <>
                <Heart size={16} />
                {interestLoading
                  ? "Enviando..."
                  : "Manifestar interesse"}
              </>
            )}
          </Button>
        )}
      </div>

      {/* AVISO PARA O FUNDO */}
      {isFundoRole && (
        <Card className="border-brand/20 bg-brand/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-brand mt-0.5 shrink-0" />

              <div>
                <h3 className="font-semibold text-foreground">
                  Interesse na operação
                </h3>

                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Ao manifestar interesse, sua intenção será registrada
                  pela Ingenium para avaliação e eventual contato com os
                  responsáveis pela operação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* INFORMAÇÕES FINANCEIRAS */}
      <div className="space-y-3">
        <Collapsible defaultOpen>
          <Card className="border-border shadow-sm">
            <CollapsibleTrigger className="w-full group">
              <CardHeader className="border-b border-border/50 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Capital Requirements & Financials
                </CardTitle>

                <ChevronDown
                  size={16}
                  className="text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                />
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="p-0">
                <dl className="divide-y divide-border/50">

                  <div className="px-5 py-2.5 grid grid-cols-3 gap-4 items-center bg-muted/5">
                    <dt className="text-sm text-muted-foreground">
                      Raise Target
                    </dt>

                    <dd className="text-base font-mono font-semibold col-span-2">
                      {formatCurrency(asset.valorCaptacao)}
                    </dd>
                  </div>

                  <div className="px-5 py-2.5 grid grid-cols-3 gap-4 items-center">
                    <dt className="text-sm text-muted-foreground">
                      Expected ROI
                    </dt>

                    <dd className="text-base font-mono font-semibold text-brand col-span-2">
                      {formatPercent(asset.roiPrevisto)}
                    </dd>
                  </div>

                  <div className="px-5 py-2.5 grid grid-cols-3 gap-4 items-center">
                    <dt className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock size={13} />
                      Term
                    </dt>

                    <dd className="text-sm col-span-2">
                      {asset.prazo
                        ? `${asset.prazo} meses`
                        : "—"}
                    </dd>
                  </div>

                  <div className="px-5 py-2.5 grid grid-cols-3 gap-4 items-center">
                    <dt className="text-sm text-muted-foreground">
                      Stage
                    </dt>

                    <dd className="text-sm col-span-2">
                      {asset.estagio}
                    </dd>
                  </div>

                  {asset.garantias && (
                    <div className="px-5 py-2.5 grid grid-cols-3 gap-4">
                      <dt className="text-sm text-muted-foreground flex items-center gap-1">
                        <ShieldCheck size={13} />
                        Garantias
                      </dt>

                      <dd className="text-sm col-span-2 text-muted-foreground">
                        {asset.garantias}
                      </dd>
                    </div>
                  )}

                  {asset.descricao && (
                    <div className="px-5 py-2.5 grid grid-cols-3 gap-4">
                      <dt className="text-sm text-muted-foreground">
                        Descrição
                      </dt>

                      <dd className="text-sm col-span-2 whitespace-pre-wrap text-muted-foreground leading-relaxed">
                        {asset.descricao}
                      </dd>
                    </div>
                  )}

                </dl>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* UNDERWRITING */}
        <Collapsible defaultOpen>
          <Card className="border-border shadow-sm">
            <CollapsibleTrigger className="w-full group">
              <CardHeader className="border-b border-border/50 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck
                    size={16}
                    className="text-brand"
                  />
                  Underwriting Institucional
                </CardTitle>

                <ChevronDown
                  size={16}
                  className="text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                />
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="[&_>div]:border-0 [&_>div]:shadow-none [&_>div]:rounded-none">
                <UnderwritingPanel assetId={assetId} />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* SPE */}
        <Collapsible defaultOpen>
          <Card className="border-border shadow-sm">
            <CollapsibleTrigger className="w-full group">
              <CardHeader className="border-b border-border/50 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp
                    size={16}
                    className="text-brand"
                  />
                  Acompanhamento da SPE
                </CardTitle>

                <ChevronDown
                  size={16}
                  className="text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                />
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="[&_>div]:border-0 [&_>div]:shadow-none [&_>div]:rounded-none">
                <SpeLifecyclePanel asset={asset} />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* COPILOT */}
        <Collapsible>
          <Card className="border-border shadow-sm">
            <CollapsibleTrigger className="w-full group">
              <CardHeader className="border-b border-border/50 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap
                    size={16}
                    className="text-brand"
                  />
                  Sugestões do Copilot
                </CardTitle>

                <ChevronDown
                  size={16}
                  className="text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                />
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="[&_>div]:border-0 [&_>div]:shadow-none [&_>div]:rounded-none">
                <CopilotSuggestionsPanel assetId={assetId} />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* METADATA */}
        <Collapsible>
          <Card className="border-border shadow-sm">
            <CollapsibleTrigger className="w-full group">
              <CardHeader className="border-b border-border/50 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText
                    size={16}
                    className="text-brand"
                  />
                  Asset Metadata
                </CardTitle>

                <ChevronDown
                  size={16}
                  className="text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                />
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Asset ID
                  </p>

                  <p className="font-mono text-sm">
                    {asset.id
                      .toString()
                      .padStart(6, "0")}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Added On
                  </p>

                  <p className="text-sm flex items-center gap-1">
                    <Calendar
                      size={14}
                      className="text-muted-foreground"
                    />

                    {new Date(
                      asset.createdAt,
                    ).toLocaleDateString("pt-BR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Status
                  </p>

                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                  >
                    Seeking Capital
                  </Badge>
                </div>

              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

      </div>

      {/* ========================================================= */}
      {/* MATCHES — SOMENTE ATIVO / ADMIN */}
      {/* ========================================================= */}

      {!isFundoRole && (
        <Collapsible defaultOpen>
          <Card className="border-border shadow-sm">

            <CollapsibleTrigger className="w-full group">
              <CardHeader className="border-b border-border/50 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-brand" />

                  {isAtivoRole
                    ? "Fundos mais compatíveis"
                    : "Compatible Funds"}
                </CardTitle>

                <ChevronDown
                  size={16}
                  className="text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                />
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="p-0">

                {isMatchesLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : matches?.length === 0 ? (
                  <div className="p-12 text-center border-t border-border border-dashed">

                    <Zap className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />

                    <h3 className="text-lg font-medium text-foreground mb-1">
                      {isAtivoRole
                        ? "Nenhum match ainda"
                        : "No matches generated"}
                    </h3>

                    <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                      {isAtivoRole
                        ? "Rode o motor de matching pra ver quantos fundos têm tese compatível com sua operação."
                        : "Run the matching engine to find capital sources whose criteria fit this project."}
                    </p>

                    <Button
                      onClick={handleRunMatch}
                      disabled={runMatching.isPending}
                    >
                      Run Matching Engine
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">

                    {matches?.map((match) => {
                      const isDisqualified =
                        match.scoreFinal === 0;

                      const reason = isDisqualified
                        ? (
                            match.motivos?.[0] ??
                            "Não compatível com a tese do fundo"
                          )
                        : null;

                      return (
                        <Link
                          key={match.id}
                          href={`/matches/${match.id}`}
                          className="block hover:bg-muted/30 transition-colors p-4 group"
                        >
                          <div className="flex items-center justify-between">

                            <div className="flex-1 min-w-0 pr-4">

                              <div className="flex items-center gap-2 mb-1">

                                <span
                                  className={`font-semibold transition-colors ${
                                    isDisqualified
                                      ? "text-muted-foreground"
                                      : "text-foreground group-hover:text-brand"
                                  }`}
                                >
                                  {match.fundo?.nome}
                                </span>

                                {isDisqualified && (
                                  <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                                    Não compatível
                                  </span>
                                )}

                              </div>

                              {isDisqualified ? (
                                <div className="text-xs text-destructive/80 truncate">
                                  {reason}
                                </div>
                              ) : (
                                <div className="flex items-center gap-4 text-xs text-muted-foreground truncate">

                                  <span className="truncate max-w-[300px]">
                                    {match.fundo?.tese}
                                  </span>

                                  <span className="font-mono flex-shrink-0">
                                    Ticket:{" "}
                                    {formatCurrency(
                                      match.fundo?.ticketMin || 0,
                                    )}{" "}
                                    -{" "}
                                    {formatCurrency(
                                      match.fundo?.ticketMax || 0,
                                    )}
                                  </span>

                                </div>
                              )}

                            </div>

                            <div className="flex items-center gap-6">

                              <div className="text-right">

                                <div
                                  className={`text-2xl font-bold tracking-tight ${getScoreColor(
                                    match.scoreFinal,
                                  )}`}
                                >
                                  {formatScore(
                                    match.scoreFinal,
                                  )}
                                </div>

                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                                  Match Score
                                </div>

                              </div>

                              <ArrowRight className="text-muted-foreground/50 group-hover:text-foreground transition-colors" />

                            </div>

                          </div>
                        </Link>
                      );
                    })}

                  </div>
                )}

              </CardContent>
            </CollapsibleContent>

          </Card>
        </Collapsible>
      )}

    </div>
  );
}