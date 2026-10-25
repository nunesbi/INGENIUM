import { useParams, Link, Redirect } from "wouter";
import { useGetMatch, getGetMatchQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatPercent, getScoreColor, formatScore } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Target, 
  BrainCircuit, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Briefcase,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const matchId = parseInt(id, 10);
  const { user } = useAuth();

  const { data: match, isLoading } = useGetMatch(matchId, {
    query: { enabled: !!matchId, queryKey: getGetMatchQueryKey(matchId) }
  });

  // LGPD: fundos/ativos can only open matches where their own company is involved.
  if (user && user.role !== "admin" && match) {
    const c = user.company.trim().toLowerCase();
    const involved =
      match.fundo?.nome.trim().toLowerCase() === c ||
      match.ativo?.nome.trim().toLowerCase() === c;
    if (!involved) return <Redirect to="/matches" />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-20">
        <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Match Not Found</h2>
        <p className="text-muted-foreground mb-6">The analysis report doesn't exist.</p>
        <Button asChild>
          <Link href="/matches">Back to Matches</Link>
        </Button>
      </div>
    );
  }

  const { fundo, ativo } = match;
  const isHighMatch = match.scoreFinal >= 75;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/matches" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Log
        </Link>
      </div>

      {/* Hero Score Section */}
      <Card className={`border-2 ${isHighMatch ? 'border-brand/50 bg-brand/5' : 'border-border'} shadow-lg overflow-hidden relative`}>
        {isHighMatch && (
          <div className="absolute top-0 right-0 p-4">
            <Badge className="bg-brand hover:bg-brand text-white font-semibold">ALTA CONVICÇÃO</Badge>
          </div>
        )}
        <CardContent className="p-8 lg:p-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            
            {/* Fund Side */}
            <div className="flex-1 text-center lg:text-right">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-4">
                <Briefcase size={20} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{fundo?.nome}</h2>
              <p className="text-muted-foreground text-sm mt-1">{fundo?.tese}</p>
              <Button variant="link" asChild className="mt-2 text-brand">
                <Link href={`/funds/${match.fundoId}`}>View Fund Details <ArrowRight size={14} className="ml-1" /></Link>
              </Button>
            </div>

            {/* Score Center */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center">
              <div className="relative">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
                  <circle 
                    cx="80" cy="80" r="70" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={440} 
                    strokeDashoffset={440 - (440 * match.scoreFinal) / 100}
                    className={`${getScoreColor(match.scoreFinal)} transition-all duration-1000 ease-out`} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-5xl font-bold tracking-tighter ${getScoreColor(match.scoreFinal)}`}>
                    {formatScore(match.scoreFinal)}
                  </span>
                </div>
              </div>
              <p className="text-xs uppercase tracking-widest font-mono text-muted-foreground mt-4">Match Score</p>
            </div>

            {/* Asset Side */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-4">
                <FileText size={20} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{ativo?.nome}</h2>
              <p className="text-muted-foreground text-sm mt-1">{ativo?.tipoAtivo} • {ativo?.regiao}</p>
              <Button variant="link" asChild className="mt-2 text-brand">
                <Link href={`/assets/${match.ativoId}`}>View Asset Details <ArrowRight size={14} className="ml-1" /></Link>
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Breakdown */}
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-brand" />
              Algorithmic Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-border/50">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Logical Rules Score</p>
                <p className="text-2xl font-mono font-semibold">{formatScore(match.score)}<span className="text-sm text-muted-foreground">/100</span></p>
                <p className="text-xs text-muted-foreground mt-1">Ticket size, ROI, Stage, Region</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Semantic Similarity</p>
                <p className="text-2xl font-mono font-semibold">{formatScore(match.similaridade)}<span className="text-sm text-muted-foreground">/100</span></p>
                <p className="text-xs text-muted-foreground mt-1">Thesis vs Description alignment</p>
              </div>
            </div>

            {(() => {
              const fortes = (match.pontosFortes && match.pontosFortes.length > 0)
                ? match.pontosFortes
                : match.motivos.filter(m => !/fora|não |abaixo|distante|pouco|incompat/i.test(m));
              const fracos = (match.pontosFracos && match.pontosFracos.length > 0)
                ? match.pontosFracos
                : match.motivos.filter(m => /fora|não |abaixo|distante|pouco|incompat/i.test(m));

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-emerald-500 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Pontos Fortes ({fortes.length})
                    </h4>
                    {fortes.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nenhum ponto forte identificado.</p>
                    ) : (
                      <ul className="space-y-3">
                        {fortes.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                            <span className="text-foreground leading-relaxed">{p}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-destructive flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Pontos Fracos ({fracos.length})
                    </h4>
                    {fracos.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nenhuma fraqueza encontrada — match excelente!</p>
                    ) : (
                      <ul className="space-y-3">
                        {fracos.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
                            <span className="text-foreground leading-relaxed">{p}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Comparison Table */}
        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg">Key Data Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="overflow-x-auto h-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead className="w-[120px]">Parameter</TableHead>
                    <TableHead>Fund Requirement</TableHead>
                    <TableHead>Asset Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground text-xs uppercase">Capital</TableCell>
                    <TableCell className="font-mono text-sm">{formatCurrency(fundo?.ticketMin || 0)} - {formatCurrency(fundo?.ticketMax || 0)}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold">{formatCurrency(ativo?.valorCaptacao || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground text-xs uppercase">ROI</TableCell>
                    <TableCell className="font-mono text-sm">{formatPercent(fundo?.roiMinimo || 0)} min</TableCell>
                    <TableCell className="font-mono text-sm">{formatPercent(ativo?.roiPrevisto || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground text-xs uppercase">Stage</TableCell>
                    <TableCell className="text-sm">{fundo?.estagio}</TableCell>
                    <TableCell className="text-sm">{ativo?.estagio}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground text-xs uppercase">Region</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate" title={fundo?.regioes.join(", ")}>{fundo?.regioes.join(", ")}</TableCell>
                    <TableCell className="text-sm">{ativo?.regiao}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground text-xs uppercase">Segment</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate" title={fundo?.segmentos.join(", ")}>{fundo?.segmentos.join(", ")}</TableCell>
                    <TableCell className="text-sm">{ativo?.tipoAtivo}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* AI Explanation */}
      {match.explicacaoAI && (
        <Card className="border-border shadow-sm bg-muted/10">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-brand" />
              Resumo da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
              {match.explicacaoAI.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4 last:mb-0">{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
