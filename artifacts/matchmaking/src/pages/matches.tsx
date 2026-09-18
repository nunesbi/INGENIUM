import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListMatches } from "@workspace/api-client-react";
import { formatCurrency, getScoreColor, formatScore } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ArrowRight, Activity, ArrowDownToLine, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";

export default function Matches() {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { data: matches, isLoading } = useListMatches();

  // LGPD: fundos and ativos only see matches involving their own company.
  const isScoped = user && user.role !== "admin";
  const scopedMatches = useMemo(() => {
    if (!matches) return matches;
    if (!isScoped || !user) return matches;
    const c = user.company.trim().toLowerCase();
    return matches.filter(
      (m) =>
        m.fundo?.nome.trim().toLowerCase() === c ||
        m.ativo?.nome.trim().toLowerCase() === c,
    );
  }, [matches, isScoped, user]);

  const filteredMatches = scopedMatches?.filter(m =>
    m.fundo?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.ativo?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={isScoped ? "Seus matches" : "Matches"}
        description={
          isScoped
            ? "Conexões que a equipe Ingenium liberou para você, ordenadas por compatibilidade."
            : "Todos os matches gerados, ordenados por compatibilidade."
        }
      />

      {isScoped && (
        <Card className="border-brand/20 bg-brand/5">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck size={18} className="text-brand flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <b className="text-foreground">Privacidade preservada · LGPD / GDPR / CCPA.</b> Você vê apenas matches em
              que sua empresa está envolvida — nunca conexões de outras partes.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center gap-3 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por fundo ou ativo..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-matches"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2 ml-auto" disabled>
             <ArrowDownToLine size={14} /> Exportar CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10 border-border/60">
                <TableHead className="w-[100px]">Score</TableHead>
                <TableHead>Fundo</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Captação</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredMatches?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Activity className="h-8 w-8 text-muted-foreground/50" />
                      <p>Nenhum match encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatches?.map((match) => (
                  <TableRow key={match.id} className="group hover:bg-muted/30">
                    <TableCell>
                      <div className={`font-mono text-lg font-bold ${getScoreColor(match.scoreFinal)}`}>
                        {formatScore(match.scoreFinal)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/funds/${match.fundoId}`} className="font-medium text-foreground hover:underline">
                        {match.fundo?.nome}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {match.fundo?.tese}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/assets/${match.ativoId}`} className="font-medium text-foreground hover:underline">
                        {match.ativo?.nome}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {match.ativo?.tipoAtivo} • {match.ativo?.regiao}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCurrency(match.ativo?.valorCaptacao || 0)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity text-brand hover:text-brand hover:bg-[#d6972b]/10">
                        <Link href={`/matches/${match.id}`}>
                          Análise <ArrowRight size={14} className="ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
