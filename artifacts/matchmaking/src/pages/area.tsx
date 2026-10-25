import { useAuth, docsProgress } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { LegalFooter } from "@/components/legal-footer";
import { Link, Redirect } from "wouter";
import { useT } from "@/lib/i18n";
import {
  ArrowRight, Sparkles, Target, FileText, Briefcase, Bell,
  AlertCircle, Activity, Wallet, BarChart3, Inbox, Settings,
} from "lucide-react";

export default function Area() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin") return <Redirect to="/dashboard" />;
  return (
    <div className="space-y-6">
      <DocsBanner />
      {user.role === "fundo" ? <AreaFundo /> : <AreaAtivo />}
      <LegalFooter />
    </div>
  );
}

function DocsBanner() {
  const { user } = useAuth();
  const { t } = useT();
  const progress = docsProgress(user?.docs);
  if (progress.missingRequired === 0) return null;
  return (
    <Card className="border-brand/30 bg-brand/5">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center text-brand flex-shrink-0">
          <AlertCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{t("area.docs.title", "Complete os documentos da empresa")}</div>
          <p className="text-xs text-muted-foreground">
            {t("area.docs.desc.pre", "Faltam")} <span className="text-foreground font-medium">{progress.missingRequired}</span> {t("area.docs.desc.mid", "documento(s) obrigatório(s) para liberar matches qualificados. Progresso atual:")} {progress.pct}%.
          </p>
        </div>
        <Button asChild size="sm" className="bg-brand hover:bg-brand/90 text-white flex-shrink-0">
          <Link href="/documentos">
            {t("area.docs.complete", "Completar")} <ArrowRight size={14} className="ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------- FUNDO ---------------- */

function AreaFundo() {
  const { user } = useAuth();
  const { t } = useT();
  const hasThesis = !!user?.thesis;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${t("area.welcome", "Bem-vindo")}, ${user?.name?.split(" ")[0] || ""} 👋`}
        description={`${t("area.fund.desc", "Área do fundo. Configure sua tese para receber oportunidades.")} · ${user?.company || ""}`}
        actions={
          <Button asChild className="bg-brand hover:bg-brand/90 text-white gap-2">
            <Link href="/assistant">
              <Sparkles size={16} /> {t("area.chatAI", "Conversar com a IA")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={Target} label={t("area.f.matches", "Matches")} value="0" hint={t("area.f.matches.hint", "comece sua tese")} />
        <MiniStat icon={Activity} label={t("area.f.analysis", "Em análise")} value="0" hint={t("area.f.analysis.hint", "nenhum em DD")} />
        <MiniStat icon={Wallet} label={t("area.f.capital", "Capital alocado")} value="—" hint={t("area.f.capital.hint", "sem deals fechados")} />
        <MiniStat icon={Briefcase} label={t("area.f.pipeline", "Pipeline ativo")} value="0" hint={t("area.f.pipeline.hint", "nenhuma oportunidade")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles size={16} className="text-brand" /> {t("area.f.selectedOps", "Oportunidades selecionadas")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            <EmptyState
              icon={Inbox}
              title={t("area.f.empty.title", "Nenhum match ainda")}
              description={
                hasThesis
                  ? t("area.f.empty.has", "Sua tese está configurada. Assim que ativos compatíveis surgirem, eles aparecerão aqui.")
                  : t("area.f.empty.no", "Configure sua tese de investimento para que a engine encontre ativos compatíveis.")
              }
              action={
                hasThesis ? (
                  <Button asChild variant="outline" className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand">
                    <Link href="/assets">{t("area.f.exploreAssets", "Explorar ativos disponíveis")} <ArrowRight size={14} className="ml-1" /></Link>
                  </Button>
                ) : (
                  <Button asChild className="bg-brand hover:bg-brand/90 text-white">
                    <Link href="/configuracoes">{t("area.f.configThesis", "Configurar tese")} <ArrowRight size={14} className="ml-1" /></Link>
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wallet size={16} className="text-brand" /> {t("area.f.yourThesis", "Sua tese")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {hasThesis ? (
                <>
                  {user?.segment && <ThesisRow label={t("area.f.segment", "Segmento")} value={user.segment} />}
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">{t("area.f.thesis", "Tese")}</span>
                    <span className="text-sm leading-relaxed">{user?.thesis}</span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full mt-2 gap-2">
                    <Link href="/configuracoes"><Settings size={13} /> {t("area.f.editThesis", "Editar tese")}</Link>
                  </Button>
                </>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <Target size={28} className="text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">{t("area.f.noThesis", "Você ainda não configurou sua tese de investimento.")}</p>
                  <Button asChild size="sm" className="bg-brand hover:bg-brand/90 text-white gap-2">
                    <Link href="/configuracoes"><Settings size={13} /> {t("area.f.configNow", "Configurar agora")}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell size={16} className="text-muted-foreground" /> {t("area.f.notif", "Notificações")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t("area.f.noNotif", "Sem notificações por enquanto.")}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 size={16} className="text-brand" /> {t("area.f.pipeline.title", "Pipeline de oportunidades")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10">
          <EmptyState
            icon={BarChart3}
            title={t("area.f.pipeline.empty", "Pipeline vazio")}
            description={t("area.f.pipeline.desc", "Aprovar matches da engine moverá deals automaticamente entre as fases do pipeline.")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- ATIVO ---------------- */

function AreaAtivo() {
  const { user } = useAuth();
  const { t } = useT();
  const hasProject = !!user?.thesis;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${t("area.welcome", "Bem-vindo")}, ${user?.name?.split(" ")[0] || ""} 👋`}
        description={`${t("area.asset.desc", "Área do ativo. Configure seu projeto para receber fundos.")} · ${user?.company || ""}`}
        actions={
          <Button asChild className="bg-brand hover:bg-brand/90 text-white gap-2">
            <Link href="/assistant">
              <Sparkles size={16} /> {t("area.chatAI", "Conversar com a IA")}
            </Link>
          </Button>
        }
      />

      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("area.a.progress", "Progresso de captação")}</div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl md:text-4xl font-bold tracking-tight">R$ 0</span>
                <span className="text-muted-foreground">{t("area.a.ofGoal", "de meta não definida")}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-muted text-muted-foreground border border-border/40 rounded-full px-3 py-1.5">
              <Activity size={14} />
              <span className="text-sm font-medium">0% {t("area.a.raised", "captado")}</span>
            </div>
          </div>
          <Progress value={0} className="h-2" />
          <div className="mt-6 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {hasProject
                ? t("area.a.config.hasProj", "Configure os dados financeiros do projeto (ROI alvo, prazo, meta de captação).")
                : t("area.a.config.noProj", "Conte mais sobre seu projeto para começar a aparecer para os fundos.")}
            </p>
            <Button asChild variant="outline" size="sm" className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand gap-2">
              <Link href="/configuracoes"><Settings size={13} /> {hasProject ? t("area.a.editData", "Editar dados") : t("area.a.configProj", "Configurar projeto")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={Sparkles} label={t("area.a.s.interested", "Fundos interessados")} value="0" hint={t("area.a.s.interested.hint", "curadoria Ingenium")} />
        <MiniStat icon={Briefcase} label={t("area.a.s.contact", "Em contato")} value="0" hint={t("area.a.s.contact.hint", "aguardando")} />
        <MiniStat icon={FileText} label={t("area.a.s.dd", "DD em curso")} value="0" hint="—" />
        <MiniStat icon={Target} label={t("area.a.s.proposals", "Propostas")} value="0" hint="—" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles size={16} className="text-brand" /> {t("area.a.interested.title", "Fundos interessados")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <EmptyState
              icon={Inbox}
              title={t("area.a.curation.title", "Aguardando curadoria")}
              description={t("area.a.curation.desc", "Por privacidade, o catálogo de fundos não é público. O time Ingenium analisa sua operação e apresenta apenas os fundos com tese compatível — eles aparecem em 'Fundos interessados'.")}
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/matches">{t("area.a.openMatches", "Abrir caixa de matches")} <ArrowRight size={13} className="ml-1" /></Link>
                </Button>
              }
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target size={16} className="text-brand" /> {t("area.a.nextSteps", "Próximos passos")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Todo done text={t("area.a.todo.signup", "Cadastro inicial")} />
            <Todo done={!!user?.cnpj} text={t("area.a.todo.company", "Dados da empresa (CNPJ, telefone)")} />
            <Todo done={hasProject} text={t("area.a.todo.proj", "Descrição do projeto")} />
            <Todo done={docsProgress(user?.docs).missingRequired === 0} text={t("area.a.todo.docs", "Documentos obrigatórios")} urgent />
            <Button asChild variant="outline" size="sm" className="w-full mt-2 gap-2">
              <Link href="/documentos">{t("area.a.openDocs", "Abrir documentos")} <ArrowRight size={13} /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- shared building blocks ---------------- */

function MiniStat({ icon: Icon, label, value, hint }: {
  icon: any; label: string; value: string; hint?: string;
}) {
  const isEmpty = value === "0" || value === "—";
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isEmpty ? "bg-muted text-muted-foreground" : "bg-brand/10 text-brand"
          }`}>
            <Icon size={14} />
          </div>
        </div>
        <div className={`text-2xl font-bold tracking-tight ${isEmpty ? "text-muted-foreground" : ""}`}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function ThesisRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Todo({ text, done, urgent }: { text: string; done?: boolean; urgent?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
        done ? "bg-brand border-brand" : urgent ? "border-destructive" : "border-border"
      }`}>
        {done && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
        {urgent && !done && <AlertCircle size={10} className="text-destructive" />}
      </div>
      <span className={`text-sm leading-snug ${done ? "line-through text-muted-foreground" : ""}`}>{text}</span>
    </div>
  );
}


function EmptyState({ icon: Icon, title, description, action }: {
  icon: any; title: string; description: string; action?: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto py-4 gap-3">
      <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
        <Icon size={20} />
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
      <Badge variant="outline" className="mt-2 text-[10px] gap-1 bg-muted/40 text-muted-foreground">
        {t("area.waitingData", "Aguardando dados reais")}
      </Badge>
    </div>
  );
}
