import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { LegalFooter } from "@/components/legal-footer";
import { useToast } from "@/hooks/use-toast";
import {
  User, Lock, Bell, CreditCard, LogOut, Briefcase, Building2, AlertTriangle, ShieldCheck,
  Download, Trash2, ShieldAlert,
} from "lucide-react";
import { useLocation, Link } from "wouter";

const SEGMENTS = ["Logístico", "Residencial", "Comercial", "Hotelaria", "Industrial", "Multimercado"];

export default function Configuracoes() {
  const { user, updateUser, logout, deleteAccount, exportData } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    name: user?.name || "",
    company: user?.company || "",
    email: user?.email || "",
    cnpj: user?.cnpj || "",
    phone: user?.phone || "",
    segment: user?.segment || "",
    thesis: user?.thesis || "",
  });
  const [notifs, setNotifs] = useState({ email: true, push: false, weekly: true, matches: true });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [consent, setConsent] = useState({
    marketing: user?.consent?.marketing ?? false,
    analytics: user?.consent?.analytics ?? false,
  });
  const [deleteConfirm, setDeleteConfirm] = useState("");

  if (!user) return null;

  const handleSaveProfile = () => {
    updateUser({
      name: profile.name, company: profile.company, email: profile.email,
      cnpj: profile.cnpj, phone: profile.phone, segment: profile.segment, thesis: profile.thesis,
    });
    toast({ title: "Perfil atualizado" });
  };

  const handleSavePassword = () => {
    if (!pw.current || !pw.next) { toast({ title: "Preencha os campos", variant: "destructive" }); return; }
    if (pw.next !== pw.confirm) { toast({ title: "Senhas não coincidem", variant: "destructive" }); return; }
    setPw({ current: "", next: "", confirm: "" });
    toast({ title: "Senha alterada" });
  };

  const handleLogout = () => { logout(); setLocation("/"); };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingenium-meus-dados-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download iniciado", description: "Seus dados foram exportados em JSON." });
  };

  const handleDelete = () => {
    if (deleteConfirm !== "EXCLUIR") {
      toast({ title: "Digite EXCLUIR para confirmar", variant: "destructive" });
      return;
    }
    deleteAccount();
    toast({ title: "Conta excluída", description: "Todos os seus dados foram removidos." });
    setLocation("/");
  };

  const handleSaveConsent = () => {
    const next = {
      lgpd: user.consent?.lgpd ?? true,
      marketing: consent.marketing,
      analytics: consent.analytics,
      acceptedAt: new Date().toISOString(),
    };
    updateUser({ consent: next });
    // Also sync the cookie banner choice.
    window.localStorage.setItem("ingenium_consent", JSON.stringify({
      essential: true, analytics: consent.analytics, marketing: consent.marketing, acceptedAt: next.acceptedAt,
    }));
    toast({ title: "Preferências de privacidade salvas" });
  };

  const isOnlyAtivo = user.role === "ativo";
  const isFundo = user.role === "fundo";

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Gerencie seu perfil, segurança, privacidade e preferências da conta." />

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="bg-muted/40 flex-wrap h-auto">
          <TabsTrigger value="perfil" className="gap-2"><User size={14} /> Perfil</TabsTrigger>
          {user.role !== "admin" && (
            <TabsTrigger value="tese" className="gap-2"><Briefcase size={14} /> {isFundo ? "Tese" : "Projeto"}</TabsTrigger>
          )}
          <TabsTrigger value="senha" className="gap-2"><Lock size={14} /> Senha</TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-2"><Bell size={14} /> Notificações</TabsTrigger>
          <TabsTrigger value="privacidade" className="gap-2"><ShieldCheck size={14} /> Privacidade & dados</TabsTrigger>
          <TabsTrigger value="plano" className="gap-2"><CreditCard size={14} /> Plano</TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil" className="space-y-4">
          <Card className="border-border/60">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-4 pb-5 border-b border-border/40">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d6972b] to-[#b8801f] flex items-center justify-center text-white text-xl font-semibold">
                  {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "U"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{user.name}</span>
                    <Badge variant="outline" className="bg-brand/10 text-brand border-brand/30 gap-1">
                      {user.role === "fundo" ? <Briefcase size={11} /> : user.role === "ativo" ? <Building2 size={11} /> : <ShieldCheck size={11} />}
                      {user.role === "fundo" ? "Fundo" : user.role === "ativo" ? "Ativo" : "Admin"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Conta criada em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cfg-name">Nome</Label>
                  <Input id="cfg-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-company">{isFundo ? "Nome do fundo" : isOnlyAtivo ? "Nome do projeto" : "Empresa"}</Label>
                  <Input id="cfg-company" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cfg-cnpj">CNPJ</Label>
                  <Input id="cfg-cnpj" value={profile.cnpj} onChange={(e) => setProfile({ ...profile, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-phone">Telefone</Label>
                  <Input id="cfg-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cfg-email">E-mail</Label>
                <Input id="cfg-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveProfile} className="bg-brand hover:bg-brand/90 text-white">Salvar alterações</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tese / Projeto */}
        {user.role !== "admin" && (
          <TabsContent value="tese">
            <Card className="border-border/60">
              <CardContent className="p-6 space-y-5">
                <div>
                  <h3 className="font-semibold mb-1">{isFundo ? "Sua tese de investimento" : "Sobre seu projeto"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {isFundo
                      ? "Essa informação é usada pela engine para selecionar ativos compatíveis."
                      : "Essa informação é usada para apresentar seu projeto aos fundos com tese aderente."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Segmento principal</Label>
                  <div className="flex flex-wrap gap-2">
                    {SEGMENTS.map((s) => {
                      const active = profile.segment === s;
                      return (
                        <button key={s} type="button"
                          onClick={() => setProfile({ ...profile, segment: s })}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            active ? "bg-brand text-white border-brand" : "border-border/60 text-muted-foreground hover:border-brand/40"
                          }`}>{s}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cfg-thesis">{isFundo ? "Tese (texto livre)" : "Descrição do projeto"}</Label>
                  <Textarea id="cfg-thesis" rows={4} value={profile.thesis}
                    onChange={(e) => setProfile({ ...profile, thesis: e.target.value })}
                    placeholder={isFundo
                      ? "Ticket R$ 5–50M, ROI alvo 12%+, foco em galpões logísticos AAA na região SE…"
                      : "VGV R$ 80M, captação R$ 20M em 12 meses, estágio lançamento, localização Pinheiros/SP…"
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Estes dados são usados apenas para matchmaking interno. Você controla quem vê o quê em <Link href="/documentos" className="text-brand hover:underline">Documentos</Link>.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} className="bg-brand hover:bg-brand/90 text-white">Salvar</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Senha */}
        <TabsContent value="senha">
          <Card className="border-border/60">
            <CardContent className="p-6 space-y-5 max-w-lg">
              <div className="space-y-2"><Label>Senha atual</Label><Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nova senha</Label><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
              <div className="space-y-2"><Label>Confirmar nova senha</Label><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSavePassword} className="bg-brand hover:bg-brand/90 text-white">Atualizar senha</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes">
          <Card className="border-border/60">
            <CardContent className="p-6 divide-y divide-border/40">
              <NotifRow title="E-mails de novos matches" desc="Aviso quando a engine encontrar oportunidades compatíveis." checked={notifs.matches} onChange={(v) => setNotifs({ ...notifs, matches: v })} />
              <NotifRow title="Resumo semanal" desc="Toda segunda, um digest do que aconteceu na sua conta." checked={notifs.weekly} onChange={(v) => setNotifs({ ...notifs, weekly: v })} />
              <NotifRow title="E-mails transacionais" desc="Atualizações de status, DD e propostas." checked={notifs.email} onChange={(v) => setNotifs({ ...notifs, email: v })} />
              <NotifRow title="Notificações push" desc="Avisos em tempo real no navegador." checked={notifs.push} onChange={(v) => setNotifs({ ...notifs, push: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacidade & Dados */}
        <TabsContent value="privacidade" className="space-y-4">
          <Card className="border-border/60">
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><ShieldCheck size={16} className="text-brand" /> Seus direitos</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Conforme LGPD (Lei 13.709/18 art. 18), GDPR (art. 12–22) e CCPA, você tem direito de acessar,
                  portar, corrigir, revogar consentimento e excluir seus dados a qualquer momento.
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="text-sm font-semibold pt-3">Consentimentos</h4>
                <NotifRow
                  title="Cookies essenciais"
                  desc="Sessão e segurança. Necessários para operar a plataforma."
                  checked
                  disabled
                  onChange={() => {}}
                />
                <NotifRow
                  title="Análise de uso"
                  desc="Métricas agregadas e anônimas para melhorarmos a plataforma."
                  checked={consent.analytics}
                  onChange={(v) => setConsent({ ...consent, analytics: v })}
                />
                <NotifRow
                  title="Marketing"
                  desc="Comunicações sobre novos recursos, eventos e oportunidades."
                  checked={consent.marketing}
                  onChange={(v) => setConsent({ ...consent, marketing: v })}
                />
                <div className="flex justify-end pt-1">
                  <Button onClick={handleSaveConsent} size="sm" className="bg-brand hover:bg-brand/90 text-white">Salvar consentimentos</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Download size={16} className="text-brand" /> Portabilidade</h3>
              <p className="text-xs text-muted-foreground">
                Exporte uma cópia de todos os seus dados em formato JSON estruturado.
              </p>
              <Button onClick={handleExport} variant="outline" className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand gap-2">
                <Download size={14} /> Baixar meus dados
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-destructive">
                <ShieldAlert size={16} /> Excluir conta
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sua conta e todos os documentos enviados serão removidos. Esta ação é irreversível.
                Dados de retenção fiscal podem ser mantidos por até 5 anos conforme legislação vigente.
              </p>
              <div className="space-y-2 max-w-sm">
                <Label className="text-xs">Digite <code className="bg-muted px-1 py-0.5 rounded">EXCLUIR</code> para confirmar</Label>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="EXCLUIR" data-testid="input-delete-confirm" />
              </div>
              <Button onClick={handleDelete} variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                data-testid="button-delete-account">
                <Trash2 size={14} /> Excluir minha conta permanentemente
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-6 flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold flex items-center gap-2 mb-1 text-destructive">
                  <AlertTriangle size={16} /> Encerrar sessão
                </div>
                <p className="text-sm text-muted-foreground">Você será desconectado e voltará para a página inicial.</p>
              </div>
              <Button variant="outline" onClick={handleLogout}
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <LogOut size={14} /> Sair
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            <Link href="/privacidade" className="text-brand hover:underline">Política de privacidade</Link>
            {" · "}
            <Link href="/termos" className="text-brand hover:underline">Termos de uso</Link>
          </p>
        </TabsContent>

        {/* Plano */}
        <TabsContent value="plano">
          <Card className="border-border/60">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/40">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Plano atual</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-semibold">Ingenium Pro</span>
                    <Badge className="bg-brand/15 text-brand border-brand/30" variant="outline">Trial</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">14 dias restantes do teste gratuito.</p>
                </div>
                <Button className="bg-brand hover:bg-brand/90 text-white">Fazer upgrade</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LegalFooter />
    </div>
  );
}

function NotifRow({ title, desc, checked, onChange, disabled }: {
  title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex-1">
        <div className="font-medium text-sm">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
