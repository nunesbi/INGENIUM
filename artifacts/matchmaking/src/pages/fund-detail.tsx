import { useParams, Link, useLocation } from "wouter";
import { 
  useGetFund, 
  useGetMatchesForFund, 
  useUpdateFund,
  useDeleteFund,
  getGetFundQueryKey,
  getGetMatchesForFundQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrency, formatPercent, getScoreColor, formatScore } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FundForm } from "@/components/fund-form";
import { FundPublicDataPanel } from "@/components/fund-public-data";
import { 
  ArrowLeft, 
  Building2, 
  Briefcase, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Target, 
  ArrowRight,
  Pencil,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FundDetail() {
  const { id } = useParams<{ id: string }>();
  const fundId = parseInt(id, 10);

  const { data: fund, isLoading: isFundLoading } = useGetFund(fundId, {
    query: { enabled: !!fundId, queryKey: getGetFundQueryKey(fundId) }
  });

  const { data: matches, isLoading: isMatchesLoading } = useGetMatchesForFund(fundId, {
    query: { enabled: !!fundId, queryKey: getGetMatchesForFundQueryKey(fundId) }
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const updateFund = useUpdateFund();
  const deleteFund = useDeleteFund();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Rota é admin-only (ver App.tsx) — sem mais gate por curadoria aqui.

  const handleUpdate = (data: any) => {
    updateFund.mutate({ id: fundId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFundQueryKey(fundId) });
        setSheetOpen(false);
        toast({ title: "Fund updated successfully" });
      },
      onError: (err) => {
        toast({ title: "Error updating fund", description: String(err), variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this fund? This action cannot be undone.")) {
      deleteFund.mutate({ id: fundId }, {
        onSuccess: () => {
          toast({ title: "Fund deleted" });
          setLocation("/funds");
        },
        onError: (err) => {
          toast({ title: "Error deleting fund", description: String(err), variant: "destructive" });
        }
      });
    }
  };

  if (isFundLoading) {
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

  if (!fund) {
    return (
      <div className="text-center py-20">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fund Not Found</h2>
        <p className="text-muted-foreground mb-6">The fund you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link href="/funds">Back to Funds</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/funds" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Funds
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{fund.nome}</h1>
          <p className="text-lg text-muted-foreground mt-1">{fund.tese}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil size={14} /> Edit
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle>Edit Investment Fund</SheetTitle>
                <SheetDescription>
                  Update the parameters for this capital source.
                </SheetDescription>
              </SheetHeader>
              <FundForm initialData={fund} onSubmit={handleUpdate} isLoading={updateFund.isPending} />
            </SheetContent>
          </Sheet>
          
          <Button variant="destructive" size="sm" className="gap-2" onClick={handleDelete} disabled={deleteFund.isPending}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle>Investment Parameters</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y divide-border/50">
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground">Ticket Range</dt>
                <dd className="text-sm font-mono col-span-2">
                  {formatCurrency(fund.ticketMin)} — {formatCurrency(fund.ticketMax)}
                </dd>
              </div>
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground">Target ROI</dt>
                <dd className="text-sm col-span-2 flex items-center gap-2">
                  <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">
                    {formatPercent(fund.roiMinimo)}
                  </Badge>
                  <span className="text-muted-foreground text-xs">minimum required</span>
                </dd>
              </div>
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground">Risk Profile</dt>
                <dd className="text-sm col-span-2 capitalize">
                  <Badge variant={fund.nivelRisco === 'high' ? 'destructive' : fund.nivelRisco === 'medium' ? 'default' : 'secondary'}>
                    {fund.nivelRisco} Risk
                  </Badge>
                </dd>
              </div>
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground">Target Stage</dt>
                <dd className="text-sm col-span-2 font-medium">{fund.estagio}</dd>
              </div>
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground">Segments</dt>
                <dd className="text-sm col-span-2 flex flex-wrap gap-1.5">
                  {fund.segmentos.map(seg => (
                    <Badge key={seg} variant="secondary" className="bg-muted">{seg}</Badge>
                  ))}
                </dd>
              </div>
              <div className="px-6 py-4 grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-muted-foreground">Geographies</dt>
                <dd className="text-sm col-span-2 flex flex-wrap gap-1.5">
                  {fund.regioes.map(reg => (
                    <Badge key={reg} variant="outline" className="border-border/60 text-muted-foreground flex items-center gap-1">
                      <MapPin size={10} /> {reg}
                    </Badge>
                  ))}
                </dd>
              </div>
              {fund.descricao && (
                <div className="px-6 py-4 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                  <dd className="text-sm col-span-2 whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {fund.descricao}
                  </dd>
                </div>
              )}
              {(fund.cnpj || fund.ticker) && (
                <div className="px-6 py-4 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-muted-foreground">CNPJ / Ticker</dt>
                  <dd className="text-sm col-span-2 font-mono space-x-3">
                    {fund.cnpj && <span>{fund.cnpj}</span>}
                    {fund.ticker && <Badge variant="outline">{fund.ticker}</Badge>}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-brand" />
                Fund Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fund ID</p>
                <p className="font-mono text-sm">{fund.id.toString().padStart(6, '0')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</p>
                <p className="text-sm flex items-center gap-1">
                  <Calendar size={14} className="text-muted-foreground" />
                  {new Date(fund.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Fonte ativa</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Public CVM data */}
      <div className="mt-8">
        <FundPublicDataPanel fundId={fundId} hasCnpj={!!fund.cnpj} />
      </div>

      {/* Matches Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5 text-brand" />
            Compatible Assets
          </h2>
        </div>

        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            {isMatchesLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : matches?.length === 0 ? (
              <div className="p-12 text-center">
                <Target className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No matches found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  There are currently no assets in the system that match this fund's criteria.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {matches?.map((match) => (
                  <Link key={match.id} href={`/matches/${match.id}`} className="block hover:bg-muted/30 transition-colors p-4 group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground group-hover:text-brand transition-colors">
                            {match.ativo?.nome}
                          </span>
                          <Badge variant="secondary" className="text-[10px] uppercase px-1.5 py-0">
                            {match.ativo?.tipoAtivo}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {match.ativo?.regiao}
                          </span>
                          <span className="font-mono">{formatCurrency(match.ativo?.valorCaptacao || 0)}</span>
                          <span className="flex items-center gap-1">
                            <TrendingUp size={12} /> {formatPercent(match.ativo?.roiPrevisto || 0)} ROI
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`text-2xl font-bold tracking-tight ${getScoreColor(match.scoreFinal)}`}>
                            {formatScore(match.scoreFinal)}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Match Score</div>
                        </div>
                        <ArrowRight className="text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
