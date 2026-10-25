import { useState } from "react";
import { Link } from "wouter";
import { useListFunds, useCreateFund, getListFundsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FundForm } from "@/components/fund-form";
import { Search, Plus, Building2, ArrowRight, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useMemo } from "react";

const PAGE_SIZE = 20;

export default function Funds() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { user } = useAuth();

  const { data: funds, isLoading } = useListFunds();
  const createFund = useCreateFund();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Ativos podem navegar o pool inteiro de fundos (300+ da CVM).
  // Privacidade fica em /matches (só vê matches curados) e nos chats.
  const isAtivo = user?.role === "ativo";

  const filteredFunds = funds?.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.tese.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCount = filteredFunds?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedFunds = filteredFunds?.slice(pageStart, pageStart + PAGE_SIZE);

  // Reset to page 1 when search changes
  const onSearchChange = (v: string) => {
    setSearchTerm(v);
    setPage(1);
  };

  // Compact page-number window (max 7 visible)
  const pageNumbers = useMemo<(number | "...")[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | "...")[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) out.push("...");
    for (let i = start; i <= end; i++) out.push(i);
    if (end < totalPages - 1) out.push("...");
    out.push(totalPages);
    return out;
  }, [totalPages, currentPage]);

  const handleCreate = (data: any) => {
    createFund.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFundsQueryKey() });
        setSheetOpen(false);
        toast({ title: "Fundo criado com sucesso" });
      },
      onError: (err) => {
        toast({ title: "Erro ao criar fundo", description: String(err), variant: "destructive" });
      }
    });
  };

  const newFundButton = (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button className="shrink-0 gap-2 bg-brand hover:bg-brand/90 text-white" data-testid="button-new-fund">
          <Plus size={16} /> Novo fundo
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Novo fundo de investimento</SheetTitle>
          <SheetDescription>
            Adicione uma nova fonte de capital à engine de matchmaking.
          </SheetDescription>
        </SheetHeader>
        <FundForm onSubmit={handleCreate} isLoading={createFund.isPending} />
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={isAtivo ? "Pool de fundos · 300+ FIIs CVM" : "Fundos"}
        description={
          isAtivo
            ? "Navegue todos os fundos imobiliários listados. Contato direto só após curadoria pelo time Ingenium."
            : "Gerencie fontes de capital e teses de investimento."
        }
        actions={isAtivo ? undefined : newFundButton}
      />

      {isAtivo && (
        <Card className="border-brand/20 bg-brand/5">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck size={18} className="text-brand flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <b className="text-foreground">Pool aberto · contato curado.</b> Você navega 300+ FIIs reais da CVM.
              Para iniciar conversa com qualquer fundo, a equipe Ingenium qualifica e faz a ponte — protegendo
              ambos os lados (LGPD / GDPR / CCPA).
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center gap-3 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou tese..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-search-funds"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10 border-border/60">
                <TableHead>Fundo</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>ROI alvo</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Segmentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredFunds?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="h-8 w-8 text-muted-foreground/50" />
                      <p>Nenhum fundo encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pagedFunds?.map((fund) => (
                  <TableRow key={fund.id} className="group hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{fund.nome}</span>
                        <span className="text-xs text-muted-foreground font-normal truncate max-w-[200px]">
                          {fund.tese}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className="text-muted-foreground text-xs">de</span> {formatCurrency(fund.ticketMin)}
                      <br/>
                      <span className="text-muted-foreground text-xs">a</span> {formatCurrency(fund.ticketMax)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-[#d6972b]/10 text-brand border-[#d6972b]/30">
                        {formatPercent(fund.roiMinimo)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs font-medium">
                        {fund.nivelRisco}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {fund.segmentos.slice(0, 2).map(seg => (
                          <span key={seg} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground whitespace-nowrap">
                            {seg}
                          </span>
                        ))}
                        {fund.segmentos.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{fund.segmentos.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity text-brand hover:text-brand hover:bg-[#d6972b]/10">
                        <Link href={`/funds/${fund.id}`}>
                          Detalhes <ArrowRight size={14} className="ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && totalCount > 0 && (
          <div className="px-4 py-3 border-t border-border/60 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Mostrando <b className="text-foreground">{pageStart + 1}</b>–<b className="text-foreground">{Math.min(pageStart + PAGE_SIZE, totalCount)}</b> de{" "}
              <b className="text-foreground">{totalCount}</b> {totalCount === 1 ? "fundo" : "fundos"}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-page-prev"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={14} />
                </Button>
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span key={`gap-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      className={`h-8 min-w-8 px-2 text-xs ${p === currentPage ? "bg-brand hover:bg-brand/90 text-white" : ""}`}
                      onClick={() => setPage(p)}
                      data-testid={`button-page-${p}`}
                    >
                      {p}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-page-next"
                  aria-label="Próxima página"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
