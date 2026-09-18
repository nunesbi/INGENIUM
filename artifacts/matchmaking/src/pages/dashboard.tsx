import { useState } from "react";
import {
  useGetDashboardStats,
  useGetTopMatches,
  useGetRecentActivity,
  useGetScoreDistribution
} from "@workspace/api-client-react";
import { formatCurrency, getScoreColor, formatScore } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, Redirect } from "wouter";
import {
  ArrowRight, Briefcase, FileText, Target, BarChart3, Clock, Zap, ChevronDown, ChevronUp,
  Users, ShieldCheck, FolderOpen, UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "admin") return <Redirect to="/area" />;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const [matchesOpen, setMatchesOpen] = useState(true);
  const { t } = useT();

  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
  const { data: topMatches, isLoading: isLoadingMatches } = useGetTopMatches();
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivity();
  const { data: scoreDistribution, isLoading: isLoadingDistribution } = useGetScoreDistribution();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title={t("adash.title", "Dashboard")}
        description={t("adash.desc", "Visão geral da rede Ingenium: operações monitoradas, capital sob estruturação e matches de alta convicção.")}
      />

      {/* Admin shortcuts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminTile href="/admin/usuarios" label={t("adash.users", "Usuários")} icon={Users} admin={t("adash.admin", "Admin")} />
        <AdminTile href="/admin/cadastros" label={t("adash.signups", "Cadastros")} icon={UserPlus} admin={t("adash.admin", "Admin")} />
        <AdminTile href="/admin/matches" label={t("adash.matches", "Matches")} icon={ShieldCheck} admin={t("adash.admin", "Admin")} />
        <AdminTile href="/admin/documentos" label={t("adash.docs", "Documentos")} icon={FolderOpen} admin={t("adash.admin", "Admin")} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t("adash.kpi.opsMonitored", "Operações monitoradas")} value={stats?.totalAssets} icon={FileText} isLoading={isLoadingStats} />
        <KpiCard title={t("adash.kpi.fundsPool", "Fundos no pool")} value={stats?.totalFunds} icon={Briefcase} isLoading={isLoadingStats} />
        <KpiCard
          title={t("adash.kpi.capital", "Capital sob estruturação")}
          value={stats?.captacaoTotal ? formatCurrency(stats.captacaoTotal) : undefined}
          icon={BarChart3}
          isLoading={isLoadingStats}
        />
        <KpiCard
          title={t("adash.kpi.readiness", "Readiness médio")}
          value={stats?.avgScore ? formatScore(stats.avgScore) : undefined}
          icon={Target}
          isLoading={isLoadingStats}
          valueClassName={stats?.avgScore ? getScoreColor(stats.avgScore) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Top Matches — collapsible */}
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand" />
                {t("adash.highConv", "Matches de alta convicção")}
              </CardTitle>
              <div className="flex items-center gap-3">
                <Link href="/matches" className="text-sm font-medium text-brand hover:underline flex items-center gap-1">
                  {t("adash.viewAll", "Ver todos")} <ArrowRight size={14} />
                </Link>
                <button
                  onClick={() => setMatchesOpen((v) => !v)}
                  className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors"
                  aria-label={matchesOpen ? t("adash.collapse", "Recolher matches") : t("adash.expand", "Expandir matches")}
                  aria-expanded={matchesOpen}
                  data-testid="toggle-matches"
                >
                  {matchesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </CardHeader>
            {matchesOpen && (
              <CardContent className="p-0">
                {isLoadingMatches ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-12 w-full bg-muted/50" />
                    <Skeleton className="h-12 w-full bg-muted/50" />
                    <Skeleton className="h-12 w-full bg-muted/50" />
                  </div>
                ) : topMatches?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {t("adash.noMatches", "Nenhum match gerado ainda. Rode a engine em um ativo.")}
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {topMatches?.map((match) => (
                      <Link key={match.id} href={`/matches/${match.id}`} className="block hover:bg-muted/30 transition-colors p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold truncate text-foreground">{match.fundo?.nome}</span>
                              <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                              <span className="font-semibold truncate text-foreground">{match.ativo?.nome}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{match.fundo?.tese}</span>
                              <span>•</span>
                              <span>{match.ativo?.tipoAtivo}</span>
                              <span>•</span>
                              <span>{formatCurrency(match.ativo?.valorCaptacao || 0)}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-xl font-bold tracking-tight ${getScoreColor(match.scoreFinal)}`}>
                              {formatScore(match.scoreFinal)}
                            </div>
                            <div className="text-xs text-muted-foreground uppercase font-mono tracking-wider">{t("adash.score", "Score")}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">{t("adash.distribution", "Distribuição de scores")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDistribution ? (
                <Skeleton className="h-[250px] w-full bg-muted/50" />
              ) : (
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--brand-soft))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Atividade recente, somente admin */}
        <div className="space-y-8">
          <Card className="border-border/60 shadow-sm h-full">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t("adash.activity", "Atividade recente")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingActivity ? (
                <div className="p-6 space-y-6">
                  <Skeleton className="h-10 w-full bg-muted/50" />
                  <Skeleton className="h-10 w-full bg-muted/50" />
                  <Skeleton className="h-10 w-full bg-muted/50" />
                </div>
              ) : recentActivity?.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">{t("adash.noActivity", "Sem atividade recente.")}</div>
              ) : (
                <div className="p-4 space-y-6">
                  {recentActivity?.map((activity, i) => (
                    <div key={activity.id} className="relative pl-6">
                      {i !== recentActivity.length - 1 && (
                        <div className="absolute left-2 top-6 bottom-[-24px] w-[1px] bg-border/50" />
                      )}
                      <div className="absolute left-[3px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand/60 ring-4 ring-background" />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-foreground">{activity.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString()} {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminTile({ href, label, icon: Icon, admin }: { href: string; label: string; icon: any; admin: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 p-4 rounded-lg border border-border/60 hover:border-brand/60 hover:bg-muted/30 transition-colors"
    >
      <div className="h-9 w-9 rounded-md bg-brand/10 flex items-center justify-center text-brand group-hover:bg-brand/20 transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        <div className="text-xs text-muted-foreground">{admin}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
    </Link>
  );
}

function KpiCard({ title, value, icon: Icon, isLoading, valueClassName }: {
  title: string; value?: string | number; icon: any; isLoading?: boolean; valueClassName?: string;
}) {
  return (
    <Card className="border-border/60 hover:border-brand/40 transition-colors group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="tracking-tight text-xs font-medium text-muted-foreground uppercase">{title}</h3>
          <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-brand group-hover:bg-brand/20 transition-colors">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-24 bg-muted/50" />
        ) : (
          <div className={`text-2xl font-bold tracking-tight ${valueClassName || "text-foreground"}`}>
            {value !== undefined ? value : "-"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
