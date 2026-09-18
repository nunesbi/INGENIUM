import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth, UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Briefcase, Building2, Check, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { PasswordChecklist, isPasswordStrong } from "@/components/password-checklist";
import { CnpjInput, type CnpjLookupResult } from "@/components/cnpj-input";
import { useT } from "@/lib/i18n";

type Step = 1 | 2 | 3;

const SEGMENTS_FUNDO = ["Logístico", "Residencial", "Comercial", "Hotelaria", "Industrial", "Multimercado"];
const SEGMENTS_ATIVO = ["Logístico", "Residencial", "Comercial", "Hotelaria", "Industrial", "Galpão"];

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const { signup } = useAuth();
  const { t } = useT();
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<UserRole | null>(null);
  const [form, setForm] = useState({
    name: "", company: "", email: "", password: "",
    cnpj: "", phone: "", segment: "", thesis: "",
  });
  const [consent, setConsent] = useState({ lgpd: false, marketing: false, analytics: false });
  const [cnpjData, setCnpjData] = useState<CnpjLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStep2 = !!role;
  const passwordOk = isPasswordStrong(form.password);
  // company é opcional no Step 2 — quando vazio, é autopreenchido pela razão
  // social retornada pela Receita ao validar o CNPJ no Step 3.
  const canStep3 = !!(form.name && form.email && passwordOk);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!role) return;
    if (!form.phone || !form.segment) {
      setError(t("signup.err.fillPhoneSeg", "Preencha telefone e segmento."));
      return;
    }
    if (!cnpjData) {
      setError(t("signup.err.waitCnpj", "Aguarde a validação do CNPJ na Receita Federal (ou corrija o número)."));
      return;
    }
    if (!cnpjData.situacaoOk) {
      setError(`CNPJ: ${cnpjData.situacao}`);
      return;
    }
    if (!consent.lgpd) {
      setError(t("signup.err.consent", "Você precisa aceitar a Política de Privacidade e os Termos de Uso para continuar."));
      return;
    }
    setLoading(true);
    try {
      await signup({
        ...form, role,
        consent: { ...consent, acceptedAt: new Date().toISOString() },
      });
      setLocation("/documentos?onboarding=1");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("signup.err.generic", "Não foi possível concluir o cadastro.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const segments = role === "fundo" ? SEGMENTS_FUNDO : SEGMENTS_ATIVO;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-border/60">
        <Link href="/" className="font-semibold tracking-tight text-lg flex items-center gap-2">
          <ArrowLeft size={16} className="text-muted-foreground" />
          <Logo height={26} />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl"
        >
          <div className="mb-8 text-center">
            <StepIndicator step={step} />
            <h1 className="text-3xl font-bold tracking-tight mt-3">{t("signup.title", "Criar conta")}</h1>
            <p className="text-muted-foreground text-sm mt-2">
              {step === 1 && t("signup.sub.1", "Você representa um fundo ou um ativo?")}
              {step === 2 && t("signup.sub.2", "Conte um pouco sobre você.")}
              {step === 3 && t("signup.sub.3", "Dados da empresa para finalizar.")}
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RoleCard
                  selected={role === "fundo"}
                  onClick={() => setRole("fundo")}
                  icon={Briefcase}
                  title={t("signup.role.fund.title", "Sou um Fundo")}
                  description={t("signup.role.fund.desc", "Tenho capital para alocar e busco ativos imobiliários compatíveis com minha tese.")}
                  bullets={[
                    t("signup.role.fund.b1", "Recebo deals filtrados pela engine"),
                    t("signup.role.fund.b2", "Comparo oportunidades lado a lado"),
                    t("signup.role.fund.b3", "Acompanho pipeline e DD"),
                  ]}
                  testid="role-fundo"
                />
                <RoleCard
                  selected={role === "ativo"}
                  onClick={() => setRole("ativo")}
                  icon={Building2}
                  title={t("signup.role.asset.title", "Sou um Ativo")}
                  description={t("signup.role.asset.desc", "Sou um empreendedor ou SPE com um projeto buscando capital.")}
                  bullets={[
                    t("signup.role.asset.b1", "Sou apresentado aos fundos certos"),
                    t("signup.role.asset.b2", "Acompanho interesse em tempo real"),
                    t("signup.role.asset.b3", "Gerencio meu data room"),
                  ]}
                  testid="role-ativo"
                />
              </div>

              <Button
                className="w-full bg-brand hover:bg-brand/90 text-white"
                disabled={!canStep2}
                onClick={() => setStep(2)}
                data-testid="button-next-step"
              >
                {t("signup.continue", "Continuar")} <ArrowRight size={16} className="ml-1" />
              </Button>

              <div className="text-center text-sm text-muted-foreground pt-2">
                {t("signup.haveAccount", "Já tem conta?")}{" "}
                <Link href="/login" className="text-brand font-medium hover:underline">{t("nav.login", "Entrar")}</Link>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-card border border-border/60 rounded-xl shadow-sm p-6 space-y-5">
              <RoleHeader role={role!} onBack={() => setStep(1)} t={t} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("signup.name", "Seu nome")}</Label>
                  <Input id="name" placeholder="Maria Silva" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">{role === "fundo" ? t("signup.fundName", "Nome do fundo") : t("signup.spvName", "Nome do projeto/SPE")}</Label>
                  <Input id="company" placeholder={role === "fundo" ? "Ex.: Vinci Real Estate" : "Ex.: Torre Faria Lima"}
                    value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} data-testid="input-company" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("signup.email", "E-mail corporativo")}</Label>
                <Input id="email" type="email" placeholder="voce@empresa.com.br" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" data-testid="input-email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("signup.password", "Senha")}</Label>
                <Input id="password" type="password" placeholder={t("signup.password.ph", "Crie uma senha forte")} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" data-testid="input-password" />
                <PasswordChecklist password={form.password} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>{t("signup.back", "Voltar")}</Button>
                <Button type="button" className="flex-1 bg-brand hover:bg-brand/90 text-white"
                  disabled={!canStep3} onClick={() => setStep(3)} data-testid="button-next-step-3">
                  {t("signup.continue", "Continuar")} <ArrowRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={onSubmit} className="bg-card border border-border/60 rounded-xl shadow-sm p-6 space-y-5">
              <RoleHeader role={role!} onBack={() => setStep(2)} t={t} />

              <CnpjInput
                value={form.cnpj}
                onChange={(v) => setForm({ ...form, cnpj: v })}
                onResolved={(d) => {
                  setCnpjData(d);
                  // Auto-preencher razão social se ainda vazio.
                  if (d && !form.company.trim()) {
                    setForm((f) => ({ ...f, company: d.nomeFantasia || d.razaoSocial }));
                  }
                }}
                required
              />

              <div className="space-y-2">
                <Label htmlFor="phone">{t("signup.phone", "Telefone")}</Label>
                <Input id="phone" placeholder="(11) 99999-9999" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-phone" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="segment">{t("signup.segment", "Segmento principal")}</Label>
                <div className="flex flex-wrap gap-2">
                  {segments.map((s) => {
                    const active = form.segment === s;
                    return (
                      <button
                        key={s} type="button" data-testid={`chip-${s}`}
                        onClick={() => setForm({ ...form, segment: s })}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          active ? "bg-brand text-white border-brand" : "border-border/60 text-muted-foreground hover:border-brand/40"
                        }`}
                      >{s}</button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thesis">
                  {role === "fundo" ? t("signup.thesis.fund", "Tese de investimento (resumo)") : t("signup.thesis.asset", "Descreva o projeto")}
                </Label>
                <Textarea id="thesis" rows={3}
                  placeholder={role === "fundo"
                    ? "Ex.: alocamos em galpões logísticos AAA na região SE, ticket R$ 5–50M, ROI alvo 12%+."
                    : "Ex.: empreendimento residencial em Pinheiros (SP), VGV R$ 80M, captação de R$ 20M em 12 meses."
                  }
                  value={form.thesis} onChange={(e) => setForm({ ...form, thesis: e.target.value })}
                  data-testid="input-thesis" />
              </div>

              {/* LGPD consent */}
              <div className="space-y-2.5 pt-2 border-t border-border/40">
                <ConsentCheck
                  required
                  checked={consent.lgpd}
                  onChange={(v) => setConsent({ ...consent, lgpd: v })}
                  testid="consent-lgpd"
                  label={<>{t("signup.consent.lgpd.pre", "Li e aceito a")} <Link href="/privacidade" className="text-brand hover:underline">{t("signup.consent.privacy", "Política de Privacidade")}</Link> {t("signup.consent.and", "e os")} <Link href="/termos" className="text-brand hover:underline">{t("signup.consent.terms", "Termos de Uso")}</Link>. {t("signup.consent.required", "(obrigatório · LGPD art. 7º, I)")}</>}
                />
                <ConsentCheck
                  checked={consent.marketing}
                  onChange={(v) => setConsent({ ...consent, marketing: v })}
                  testid="consent-marketing"
                  label={t("signup.consent.marketing", "Quero receber comunicações sobre novos recursos, eventos e oportunidades. (opt-in · revogável a qualquer momento)")}
                />
                <ConsentCheck
                  checked={consent.analytics}
                  onChange={(v) => setConsent({ ...consent, analytics: v })}
                  testid="consent-analytics"
                  label={t("signup.consent.analytics", "Permito análise de uso anônima para melhorar a plataforma. (opt-in · revogável a qualquer momento)")}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div className="bg-muted/40 border border-border/40 rounded-lg px-4 py-3 text-xs text-muted-foreground flex gap-2 items-start">
                <Check size={14} className="text-brand mt-0.5 flex-shrink-0" />
                <span>{t("signup.afterNote", "Após criar a conta você será levado ao envio dos documentos da empresa. Você pode pular e completar depois.")}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>{t("signup.back", "Voltar")}</Button>
                <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90 text-white"
                  disabled={loading || !cnpjData || !cnpjData.situacaoOk || !consent.lgpd}
                  data-testid="button-submit-signup">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signup.submit", "Criar conta")}
                </Button>
              </div>
            </form>
          )}

          <p className="text-xs text-muted-foreground text-center mt-6">
            {t("signup.footer", "Dados validados em tempo real na Receita Federal · senha protegida com bcrypt.")}
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const { t } = useT();
  const items: { n: Step; label: string }[] = [
    { n: 1, label: t("signup.step.profile", "Perfil") },
    { n: 2, label: t("signup.step.data", "Dados") },
    { n: 3, label: t("signup.step.company", "Empresa") },
  ];
  return (
    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
      {items.map((it, i) => (
        <span key={it.n} className="flex items-center gap-2">
          <span className={step === it.n ? "text-brand font-semibold" : step > it.n ? "text-foreground/70" : ""}>
            {it.n}. {it.label}
          </span>
          {i < items.length - 1 && <span>›</span>}
        </span>
      ))}
    </div>
  );
}

function RoleHeader({ role, onBack, t }: { role: UserRole; onBack: () => void; t: (k: string, fb: string) => string }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-border/40">
      <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
        {role === "fundo" ? <Briefcase size={18} /> : <Building2 size={18} />}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">
          {role === "fundo" ? t("signup.role.fund.account", "Conta de Fundo") : t("signup.role.asset.account", "Conta de Ativo")}
        </div>
        <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-brand">
          {t("signup.changeRole", "Trocar perfil")}
        </button>
      </div>
    </div>
  );
}

function ConsentCheck({ checked, onChange, label, required, testid }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: React.ReactNode; required?: boolean; testid?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group" data-testid={testid}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border accent-[#d6972b] cursor-pointer flex-shrink-0"
      />
      <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </span>
    </label>
  );
}

function RoleCard({
  selected, onClick, icon: Icon, title, description, bullets, testid,
}: {
  selected: boolean; onClick: () => void; icon: any;
  title: string; description: string; bullets: string[]; testid: string;
}) {
  return (
    <button
      type="button" onClick={onClick} data-testid={testid}
      aria-pressed={selected}
      className={`text-left p-5 rounded-xl border-2 transition-all bg-card relative ${
        selected ? "border-brand shadow-md" : "border-border/60 hover:border-brand/40"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand flex items-center justify-center">
          <Check size={14} className="text-white" />
        </div>
      )}
      <div className="w-11 h-11 rounded-lg bg-brand/10 flex items-center justify-center text-brand mb-3">
        <Icon size={22} />
      </div>
      <div className="font-semibold text-base mb-1">{title}</div>
      <p className="text-sm text-muted-foreground mb-4 leading-snug">{description}</p>
      <ul className="space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="text-xs text-muted-foreground flex gap-2 items-start">
            <Check size={12} className="text-brand mt-0.5 flex-shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
