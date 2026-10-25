import { useState } from "react";
import { Link } from "wouter";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  Sparkles, Briefcase, ShieldCheck, TrendingUp, ArrowRight,
  Instagram, Linkedin, Mail, Phone, Menu, X, CheckCircle2,
  Upload, Brain, Network, BarChart3, Building2, Users,
  Zap, Lock, Target, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export const SERVICES = [
  { slug: "matchmaking", icon: Sparkles, title: "Captação assistida por IA", short: "Conectamos sua operação aos fundos cuja tese realmente combina — depois que ela está pronta.", color: "from-emerald-500/20 to-emerald-500/0", accent: "text-emerald-400" },
  { slug: "analise-carteira", icon: TrendingUp, title: "Underwriting institucional", short: "Score de readiness, compliance e pendências automáticas para sua SPE.", color: "from-amber-500/20 to-amber-500/0", accent: "text-[#d6972b]" },
  { slug: "due-diligence", icon: ShieldCheck, title: "Governança contínua", short: "Data room, documentação e acompanhamento de SPE — antes e depois do funding.", color: "from-sky-500/20 to-sky-500/0", accent: "text-sky-400" },
  { slug: "consultoria", icon: Briefcase, title: "Copilot do empreendedor", short: "Assistente estratégico que orienta estruturação, captação e relação com fundos.", color: "from-violet-500/20 to-violet-500/0", accent: "text-violet-400" },
] as const;

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

/* ── Animated counter ─────────────────────────────────────────── */
function Counter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const node = ref.current;
    if (!node) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate(v) { node.textContent = prefix + Math.round(v).toLocaleString("pt-BR") + suffix; },
    });
    return controls.stop;
  }, [inView, to, prefix, suffix]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}

/* ── Hero dashboard card ──────────────────────────────────────── */
function HeroDashboard() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0">
      {/* Glow */}
      <div className="absolute inset-0 bg-[#d6972b]/20 rounded-3xl blur-3xl scale-110 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden"
        style={{ perspective: 1000 }}
      >
        {/* Card header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10 bg-white/5">
          <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400/70" /><div className="w-3 h-3 rounded-full bg-yellow-400/70" /><div className="w-3 h-3 rounded-full bg-green-400/70" /></div>
          <span className="text-xs text-muted-foreground mx-auto font-mono">Ingenium · Match v2</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Score ring + info */}
          <div className="flex items-center gap-4">
            <ScoreRing score={94} />
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Torre Faria Lima III</div>
              <div className="font-semibold text-sm">Lajes Corporativas · SP</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Match ótimo</span>
                <span className="text-[10px] text-muted-foreground">ROI 13,8% a.a.</span>
              </div>
            </div>
          </div>

          {/* Compat bars */}
          <div className="space-y-2">
            {[
              { label: "Perfil de risco", pct: 92 },
              { label: "Ticket size", pct: 88 },
              { label: "Segmento", pct: 97 },
              { label: "Prazo de retorno", pct: 85 },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-28 shrink-0">{b.label}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.pct}%` }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-[#d6972b] to-amber-300"
                  />
                </div>
                <span className="text-[10px] text-[#d6972b] font-medium w-7 text-right">{b.pct}%</span>
              </div>
            ))}
          </div>

          {/* Mini KPI row */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10">
            {[
              { l: "Fundos", v: "12" },
              { l: "Ativos", v: "38" },
              { l: "Matches", v: "94" },
            ].map((k) => (
              <div key={k.l} className="bg-white/5 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-[#d6972b]">{k.v}</div>
                <div className="text-[10px] text-muted-foreground">{k.l}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating chips */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 }}
        className="absolute -right-4 top-8 hidden lg:flex items-center gap-1.5 bg-card/90 backdrop-blur border border-emerald-500/30 rounded-full px-3 py-1.5 shadow-lg">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-[11px] font-medium text-emerald-400">Ingenium ativa</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }}
        className="absolute -left-4 bottom-16 hidden lg:flex items-center gap-1.5 bg-card/90 backdrop-blur border border-[#d6972b]/30 rounded-full px-3 py-1.5 shadow-lg">
        <Zap size={11} className="text-[#d6972b]" />
        <span className="text-[11px] font-medium">+3 novos matches</span>
      </motion.div>
    </div>
  );
}

/* ── SVG score ring ───────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
        <motion.circle
          cx="32" cy="32" r={r} stroke="url(#gold)" strokeWidth="4" fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d6972b" /><stop offset="100%" stopColor="#f5c660" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold leading-none text-[#d6972b]">{score}</span>
        <span className="text-[9px] text-muted-foreground">score</span>
      </div>
    </div>
  );
}

/* ── Dashboard mockup ─────────────────────────────────────────── */
function DashboardMockup() {
  const bars = [65, 80, 55, 90, 72, 88, 94];
  const labels = ["Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
  return (
    <div className="relative w-full rounded-2xl border border-white/10 bg-card/50 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-400/60" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" /><div className="w-2.5 h-2.5 rounded-full bg-green-400/60" /></div>
          <span className="text-xs text-muted-foreground font-mono">Ingenium Analytics · Dashboard</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { l: "Score médio", v: "92", sub: "+4.2 este mês", up: true },
            { l: "Matches ativos", v: "47", sub: "+12 novos", up: true },
            { l: "Capital mapeado", v: "R$ 17,4bi", sub: "300 fundos ativos", up: true },
            { l: "Taxa de conversão", v: "68%", sub: "+3pp vs mês ant.", up: true },
          ].map((k) => (
            <div key={k.l} className="bg-white/5 rounded-xl p-3 border border-white/8">
              <div className="text-[10px] text-muted-foreground mb-1">{k.l}</div>
              <div className="text-lg font-bold tracking-tight text-foreground">{k.v}</div>
              <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-0.5">
                <TrendingUp size={9} /> {k.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Bar chart */}
          <div className="col-span-2 bg-white/5 rounded-xl p-4 border border-white/8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold">Score de compatibilidade</div>
              <span className="text-[10px] text-muted-foreground">últimos 7 meses</span>
            </div>
            <div className="flex items-end gap-2 h-20">
              {bars.map((h, i) => (
                <motion.div key={i} className="flex-1 flex flex-col items-center gap-1"
                  initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                  viewport={{ once: true }} style={{ originY: 1 }}>
                  <div className="w-full rounded-sm"
                    style={{ height: `${h}%`, background: `linear-gradient(180deg, #f5c660, #d6972b)`, opacity: i === bars.length - 1 ? 1 : 0.55 }}
                  />
                  <span className="text-[9px] text-muted-foreground">{labels[i]}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Score gauge */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/8 flex flex-col items-center justify-center gap-2">
            <div className="text-[10px] text-muted-foreground mb-1">Compatibilidade média</div>
            <ScoreRing score={92} />
            <div className="text-[10px] text-muted-foreground text-center">Carteira atual</div>
          </div>
        </div>

        {/* Pipeline row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { stage: "Novos", n: 8, color: "bg-sky-400" },
            { stage: "Em análise", n: 5, color: "bg-[#d6972b]" },
            { stage: "DD", n: 3, color: "bg-violet-400" },
            { stage: "Aprovados", n: 2, color: "bg-emerald-400" },
          ].map((p) => (
            <div key={p.stage} className="bg-white/5 rounded-lg p-2.5 border border-white/8">
              <div className={`w-2 h-2 rounded-full ${p.color} mb-1.5`} />
              <div className="text-[10px] text-muted-foreground">{p.stage}</div>
              <div className="text-base font-bold">{p.n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── How it works step card ───────────────────────────────────── */
function StepCard({ num, icon: Icon, title, desc, visual }: {
  num: string; icon: any; title: string; desc: string; visual: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm hover:border-[#d6972b]/40 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#d6972b]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-[#d6972b]/10 border border-[#d6972b]/20 flex items-center justify-center text-[#d6972b]">
            <Icon size={20} />
          </div>
          <span className="text-4xl font-black text-white/5 select-none">{num}</span>
        </div>
        <div>
          <h3 className="font-semibold text-base mb-1.5">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/5 overflow-hidden">
          {visual}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Step visuals ─────────────────────────────────────────────── */
function UploadVisual() {
  return (
    <div className="p-4 flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
        <Upload size={22} className="text-sky-400" />
      </div>
      <div className="w-full space-y-1.5">
        {["Regulamento.pdf", "Tese_2025.docx", "Histórico.xlsx"].map((f, i) => (
          <motion.div key={f} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }} viewport={{ once: true }}
            className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
            <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground truncate">{f}</span>
            <span className="ml-auto text-[9px] text-emerald-400">ok</span>
          </motion.div>
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground">Criptografado · LGPD/GDPR</div>
    </div>
  );
}

function AIVisual() {
  const scores = [
    { l: "Risco", v: 92 }, { l: "Retorno", v: 87 }, { l: "Compliance", v: 96 },
  ];
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Brain size={16} className="text-violet-400" />
        <span className="text-[11px] font-mono text-violet-400">Analisando ativo…</span>
        <motion.div className="ml-auto flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-1 h-3 rounded-full bg-violet-400"
              animate={{ scaleY: [1, 2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </motion.div>
      </div>
      {scores.map((s) => (
        <div key={s.l} className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-16">{s.l}</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} whileInView={{ width: `${s.v}%` }}
              transition={{ duration: 0.8, delay: 0.5 }} viewport={{ once: true }}
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300" />
          </div>
          <span className="text-[10px] text-violet-300 w-6">{s.v}</span>
        </div>
      ))}
      <div className="text-center pt-1">
        <span className="text-[10px] text-muted-foreground">Score final: </span>
        <span className="text-[10px] font-bold text-[#d6972b]">92 / 100</span>
      </div>
    </div>
  );
}

function MatchVisual() {
  const matches = [
    { name: "Vinci RE FII", score: 96 },
    { name: "BTG Logística", score: 92 },
    { name: "Kinea Renda", score: 88 },
  ];
  return (
    <div className="p-4 space-y-2.5">
      <div className="flex items-center gap-1.5 mb-3">
        <Network size={14} className="text-[#d6972b]" />
        <span className="text-[11px] text-[#d6972b] font-medium">Fundos compatíveis</span>
      </div>
      {matches.map((m, i) => (
        <motion.div key={m.name} initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
          viewport={{ once: true }}
          className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
          <div className="w-6 h-6 rounded-full bg-[#d6972b]/15 flex items-center justify-center flex-shrink-0">
            <Briefcase size={10} className="text-[#d6972b]" />
          </div>
          <span className="text-[10px] font-medium flex-1 truncate">{m.name}</span>
          <span className="text-[10px] font-bold text-[#d6972b]">{m.score}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Real-estate photo card ───────────────────────────────────── */
function BuildingCard({ url, label, sub }: { url: string; label: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl overflow-hidden border border-white/10 shadow-xl"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-[11px] text-white/60 mt-0.5">{sub}</div>
      </div>
    </motion.div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function Landing() {
  const { user } = useAuth();
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ nome: "", email: "", mensagem: "" });

  const navItems: Array<[string, string, string]> = [
    ["home", "nav.home", "Home"],
    ["como-funciona", "nav.how", "Como funciona"],
    ["servicos", "nav.services", "Serviços"],
    ["contato", "nav.contact", "Fale Conosco"],
  ];

  const [sending, setSending] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.mensagem) { toast({ title: t("contact.fillAll", "Preencha todos os campos"), variant: "destructive" }); return; }
    setSending(true);
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const res = await fetch(`${base}api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: t("contact.sent", "Mensagem enviada!"), description: t("contact.sentDesc", "Em breve nossa equipe entrará em contato.") });
      setForm({ nome: "", email: "", mensagem: "" });
    } catch (err) {
      toast({ title: t("contact.error", "Erro ao enviar"), description: t("contact.errorDesc", "Tente novamente em alguns instantes."), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo("home")} className="flex items-center" data-testid="link-logo">
            <Logo height={30} />
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {navItems.map(([id, key, fb]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-muted-foreground hover:text-foreground transition-colors">{t(key, fb)}</button>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Link href="/area"><Button size="sm" className="bg-brand hover:bg-brand/90 text-white">{t("nav.area", "Minha área")}</Button></Link>
            ) : (
              <>
                <Link href="/login"><Button size="sm" variant="ghost">{t("nav.login", "Entrar")}</Button></Link>
                <Link href="/cadastro"><Button size="sm" className="bg-brand hover:bg-brand/90 text-white">{t("nav.signup", "Criar conta")}</Button></Link>
              </>
            )}
          </div>
          <div className="md:hidden flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <button className="p-2 -mr-2 text-muted-foreground" onClick={() => setMenuOpen(!menuOpen)} aria-label={t("nav.menu", "Menu")}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg">
            <div className="px-4 py-4 space-y-2 flex flex-col">
              {navItems.map(([id, key, fb]) => (
                <button key={id} onClick={() => scrollTo(id)} className="text-left py-2 text-muted-foreground hover:text-foreground">{t(key, fb)}</button>
              ))}
              {user ? (
                <Link href="/area"><Button size="sm" className="w-full bg-brand hover:bg-brand/90 text-white mt-2">{t("nav.area", "Minha área")}</Button></Link>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  <Link href="/login"><Button size="sm" variant="outline" className="w-full">{t("nav.login", "Entrar")}</Button></Link>
                  <Link href="/cadastro"><Button size="sm" className="w-full bg-brand hover:bg-brand/90 text-white">{t("nav.signup", "Criar conta")}</Button></Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section id="home" className="relative pt-28 md:pt-36 pb-20 md:pb-28 px-4 md:px-8 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-[#d6972b]/8 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#d6972b]/5 blur-3xl" />
          {/* Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(214,151,43,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(214,151,43,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
              <motion.div variants={fadeUp}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#d6972b]/30 bg-[#d6972b]/5 text-xs font-medium text-[#d6972b]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d6972b] animate-pulse" />
                {t("hero.badge", "Infraestrutura de captação · Governança · Underwriting · Para incorporadoras")}
              </motion.div>

              <motion.h1 variants={fadeUp}
                className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                {t("hero.title.part1", "Estruture sua")}{" "}
                <span className="bg-gradient-to-r from-[#d6972b] via-amber-400 to-[#d6972b] bg-clip-text text-transparent">
                  {t("hero.title.highlight", "operação")}
                </span>
                <br />{t("hero.title.part2", "pronta para captar.")}
              </motion.h1>

              <motion.p variants={fadeUp} className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                {t("hero.subtitle", "A Ingenium é a camada institucional que pequenas e médias incorporadoras usam para organizar SPEs, melhorar underwriting, reduzir risco percebido e aumentar a chance de funding.")}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
                <Link href={user ? "/area" : "/cadastro"}>
                  <Button size="lg" className="bg-brand hover:bg-brand/90 text-white gap-2 shadow-lg shadow-[#d6972b]/20 w-full sm:w-auto" data-testid="button-hero-cta">
                    {user ? t("hero.cta.area", "Ir para minha área") : t("hero.cta.signup", "Começar gratuitamente")} <ArrowRight size={18} />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" onClick={() => scrollTo("como-funciona")} className="w-full sm:w-auto gap-2">
                  <Sparkles size={16} /> {t("hero.cta.how", "Como funciona")}
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} className="flex items-center gap-6 pt-2">
                {[
                  { icon: ShieldCheck, text: t("hero.trust.lgpd", "LGPD & GDPR") },
                  { icon: Lock, text: t("hero.trust.encrypted", "Dados criptografados") },
                  { icon: Zap, text: t("hero.trust.match", "Match em segundos") },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon size={13} className="text-[#d6972b]" /> {text}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: dashboard card */}
            <div className="flex justify-center lg:justify-end">
              <HeroDashboard />
            </div>
          </div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-16 mx-auto grid grid-cols-3 gap-6 max-w-3xl border border-white/10 rounded-2xl bg-white/5 backdrop-blur px-8 py-8"
          >
            {[
              { to: 300, prefix: "", suffix: "+", l: t("hero.stats.funds", "fundos no pool") },
              { to: 17, prefix: "R$ ", suffix: "bi", l: t("hero.stats.capital", "capital mapeado") },
              { to: 13, prefix: "", suffix: "", l: t("hero.stats.segments", "segmentos cobertos") },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-4xl md:text-5xl font-black text-[#d6972b] tabular-nums tracking-tight">
                  <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="text-xs md:text-sm text-muted-foreground mt-2">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-4 md:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-sm font-semibold tracking-widest text-[#d6972b] uppercase mb-3">{t("how.eyebrow", "Processo")}</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t("how.title", "Como funciona")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("how.subtitle", "Três etapas pra transformar sua operação em algo que fundo institucional aceita.")}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StepCard num="01" icon={Upload} title={t("how.step1.title", "Conta sua operação")}
              desc={t("how.step1.desc", "Memorial, viabilidade, planilha de SPE — manda o que tiver. O Copilot organiza tudo no formato que o fundo espera ver.")}
              visual={<UploadVisual />} />
            <StepCard num="02" icon={Brain} title={t("how.step2.title", "IA aponta o que falta")}
              desc={t("how.step2.desc", "Readiness, compliance e pendências calculados na hora. Você descobre exatamente o que mexer pra ficar investível.")}
              visual={<AIVisual />} />
            <StepCard num="03" icon={Network} title={t("how.step3.title", "Conectamos com fundos certos")}
              desc={t("how.step3.desc", "A engine cruza sua tese, cronograma e governança com 300+ fundos no pool — e mostra quem combina com você.")}
              visual={<MatchVisual />} />
          </div>

          {/* Connector arrows — desktop only */}
          <div className="hidden md:flex items-center justify-center gap-0 mt-0 -mt-32 pointer-events-none relative z-10">
            {/* purely decorative, already implied by layout */}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ────────────────────────────────────── */}
      <section className="py-24 px-4 md:px-8 border-t border-border/50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
              <p className="text-sm font-semibold tracking-widest text-[#d6972b] uppercase">{t("dash.eyebrow", "Plataforma")}</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                {t("dash.title.l1", "Analytics institucional")}<br />{t("dash.title.l2", "em tempo real")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("dash.subtitle", "Dashboard executivo com KPIs de performance, scoring de matches, pipeline de oportunidades e indicadores de compliance — tudo em uma tela.")}
              </p>
              <ul className="space-y-3">
                {[
                  t("dash.li.1", "Score de compatibilidade por ativo"),
                  t("dash.li.2", "Pipeline kanban de oportunidades"),
                  t("dash.li.3", "Alertas de novos matches instantâneos"),
                  t("dash.li.4", "Relatórios de due diligence automatizados"),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 size={16} className="text-[#d6972b] mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href={user ? "/area" : "/cadastro"}>
                <Button className="bg-brand hover:bg-brand/90 text-white gap-2 shadow-lg shadow-[#d6972b]/20">
                  {t("dash.cta", "Ver meu dashboard")} <ArrowRight size={16} />
                </Button>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="relative">
                <div className="absolute inset-0 bg-[#d6972b]/15 rounded-3xl blur-3xl scale-105 pointer-events-none" />
                <DashboardMockup />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ─────────────────────────────────────────────── */}
      <section id="servicos" className="py-24 px-4 md:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-sm font-semibold tracking-widest text-[#d6972b] uppercase mb-3">{t("svc.eyebrow", "Serviços")}</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t("svc.title", "Inteligência para cada etapa")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("svc.subtitle", "Soluções modulares que se adaptam ao seu fundo, sua tese e seu momento de investimento.")}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SERVICES.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.slug} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <Link href={`/servicos/${s.slug}`}>
                    <div data-testid={`card-service-${s.slug}`}
                      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-8 hover:border-[#d6972b]/60 hover:bg-card/70 transition-all duration-300 cursor-pointer h-full">
                      <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-xl bg-background/80 border border-border/60 flex items-center justify-center mb-5 ${s.accent}`}>
                          <Icon size={22} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{t(`svc.${s.slug === "matchmaking" ? "matchmaking" : s.slug === "analise-carteira" ? "under" : s.slug === "due-diligence" ? "gov" : "copilot"}.title`, s.title)}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t(`svc.${s.slug === "matchmaking" ? "matchmaking" : s.slug === "analise-carteira" ? "under" : s.slug === "due-diligence" ? "gov" : "copilot"}.short`, s.short)}</p>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-[#d6972b] group-hover:gap-2.5 transition-all">
                          {t("svc.learnMore", "Saiba mais")} <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── IMÓVEIS / REAL ESTATE ────────────────────────────────── */}
      <section className="py-24 px-4 md:px-8 border-t border-border/50 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-sm font-semibold tracking-widest text-[#d6972b] uppercase mb-3">{t("mkt.eyebrow", "Mercado")}</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{t("mkt.title.l1", "Capital institucional")}<br />{t("mkt.title.l2", "encontrando os melhores ativos")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("mkt.subtitle", "De galpões logísticos a lajes corporativas — a Ingenium conhece cada segmento do mercado imobiliário brasileiro.")}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            <BuildingCard
              url="https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=800&q=80"
              label={t("mkt.card.offices.label", "Lajes corporativas")} sub={t("mkt.card.offices.sub", "São Paulo · Alta liquidez")} />
            <BuildingCard
              url="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80"
              label={t("mkt.card.logistics.label", "Logístico & industrial")} sub={t("mkt.card.logistics.sub", "Grande SP · Contratos âncora")} />
            <BuildingCard
              url="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80"
              label={t("mkt.card.resi.label", "Residencial premium")} sub={t("mkt.card.resi.sub", "Alto VGV · Demanda comprovada")} />
          </div>

          {/* Segment tags */}
          <div className="flex flex-wrap gap-2 justify-center">
            {["Logístico","Residencial","Lajes Corporativas","Hotelaria","Multifamily","Industrial","Data Centers","Varejo"].map((tag) => (
              <span key={tag} className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-card/40 text-muted-foreground hover:border-[#d6972b]/40 hover:text-[#d6972b] transition-colors cursor-default">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────── */}
      <section className="py-16 px-4 md:px-8 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-[#d6972b]/25 bg-gradient-to-br from-[#d6972b]/10 via-card/60 to-card/30 backdrop-blur p-10 md:p-14 text-center">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#d6972b]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[#d6972b]/10 blur-3xl pointer-events-none" />
            <div className="relative space-y-4">
              <h2 className="text-2xl md:text-4xl font-black tracking-tight">
                {t("cta.title.l1", "Pronto para fazer o")}<br />
                <span className="bg-gradient-to-r from-[#d6972b] to-amber-300 bg-clip-text text-transparent">{t("cta.title.highlight", "match perfeito")}</span>{t("cta.title.q", "?")}
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                {t("cta.subtitle", "Junte-se a 300+ fundos e centenas de ativos que já usam inteligência artificial para investir com mais precisão.")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link href={user ? "/area" : "/cadastro"}>
                  <Button size="lg" className="bg-brand hover:bg-brand/90 text-white gap-2 shadow-lg shadow-[#d6972b]/25 w-full sm:w-auto">
                    {user ? t("hero.cta.area", "Ir para minha área") : t("cta.signup", "Criar conta gratuita")} <ArrowRight size={18} />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" onClick={() => scrollTo("contato")} className="w-full sm:w-auto gap-2 border-[#d6972b]/30 hover:border-[#d6972b]/60">
                  <Users size={16} /> {t("cta.specialist", "Falar com especialista")}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CONTATO ──────────────────────────────────────────────── */}
      <section id="contato" className="py-24 px-4 md:px-8 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest text-[#d6972b] uppercase mb-3">{t("contact.eyebrow", "Fale Conosco")}</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t("contact.title", "Vamos conversar")}</h2>
            <p className="text-muted-foreground">{t("contact.subtitle", "Conte sobre sua tese ou seu ativo. Nossa equipe responde em até 24h.")}</p>
          </motion.div>
          <motion.form initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder={t("contact.name", "Seu nome")} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} data-testid="input-contato-nome" className="h-12" />
              <Input type="email" placeholder={t("contact.email", "seu@email.com")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-contato-email" className="h-12" />
            </div>
            <Textarea placeholder={t("contact.msg", "Como podemos ajudar?")} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} data-testid="input-contato-mensagem" rows={5} />
            <Button type="submit" size="lg" disabled={sending} className="w-full bg-[#d6972b] hover:bg-[#b8801f] text-white" data-testid="button-contato-enviar">
              {sending ? t("contact.sending", "Enviando…") : <>{t("contact.send", "Enviar mensagem")} <ArrowRight size={16} className="ml-2" /></>}
            </Button>
          </motion.form>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="mailto:contato@ingeniumxy.com" className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#d6972b]/10 flex items-center justify-center text-[#d6972b]"><Mail size={18} /></div>
              <div><div className="text-xs text-muted-foreground">{t("contact.email.label", "Email")}</div><div className="text-sm font-medium">contato@ingeniumxy.com</div></div>
            </a>
            <a href="https://wa.me/5513996154004" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#d6972b]/10 flex items-center justify-center text-[#d6972b]"><Phone size={18} /></div>
              <div><div className="text-xs text-muted-foreground">{t("contact.wa.label", "WhatsApp")}</div><div className="text-sm font-medium">+55 (13) 99615-4004</div></div>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-12 px-4 md:px-8 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="mb-3"><Logo height={28} /></div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                {t("footer.tagline", "Inteligência artificial a serviço do mercado imobiliário institucional. LGPD · GDPR · CCPA.")}
              </p>
              <div className="flex gap-2 mt-4">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-lg border border-border/60 bg-card/50 flex items-center justify-center text-muted-foreground hover:text-[#d6972b] hover:border-[#d6972b]/40 transition-colors" data-testid="link-instagram"><Instagram size={16} /></a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-9 h-9 rounded-lg border border-border/60 bg-card/50 flex items-center justify-center text-muted-foreground hover:text-[#d6972b] hover:border-[#d6972b]/40 transition-colors" data-testid="link-linkedin"><Linkedin size={16} /></a>
                <a href="mailto:contato@ingeniumxy.com" aria-label="Email" className="w-9 h-9 rounded-lg border border-border/60 bg-card/50 flex items-center justify-center text-muted-foreground hover:text-[#d6972b] hover:border-[#d6972b]/40 transition-colors" data-testid="link-email"><Mail size={16} /></a>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">{t("footer.platform", "Plataforma")}</div>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollTo("como-funciona")} className="text-foreground/70 hover:text-foreground">{t("nav.how", "Como funciona")}</button></li>
                <li><button onClick={() => scrollTo("servicos")} className="text-foreground/70 hover:text-foreground">{t("nav.services", "Serviços")}</button></li>
                <li><Link href={user ? "/area" : "/login"} className="text-foreground/70 hover:text-foreground">{user ? t("nav.area", "Minha área") : t("nav.login", "Entrar")}</Link></li>
                <li><Link href="/cadastro" className="text-foreground/70 hover:text-foreground">{t("nav.signup", "Criar conta")}</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">{t("footer.legal", "Legal")}</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacidade" className="text-foreground/70 hover:text-foreground">{t("footer.privacy", "Privacidade")}</Link></li>
                <li><Link href="/termos" className="text-foreground/70 hover:text-foreground">{t("footer.terms", "Termos de uso")}</Link></li>
                <li><button onClick={() => scrollTo("contato")} className="text-foreground/70 hover:text-foreground">{t("nav.contact", "Fale Conosco")}</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between gap-3 text-xs text-muted-foreground">
            <div>© {new Date().getFullYear()} Ingenium. {t("footer.rights", "Todos os direitos reservados.")}</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400" /> {t("footer.status", "Sistemas operando normalmente")}</div>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp flutuante ───────────────────────────────────── */}
      <a
        href={`https://wa.me/5513996154004?text=${encodeURIComponent(t("wa.preset", "Olá! Vim pelo site da Ingenium."))}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("wa.aria", "Fale conosco no WhatsApp")}
        data-testid="link-whatsapp-float"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white shadow-lg shadow-black/30 px-4 py-3 transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.554-5.338 11.89-11.893 11.89a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
        </svg>
        <span className="hidden sm:inline text-sm font-medium">{t("wa.label", "WhatsApp")}</span>
      </a>
    </div>
  );
}
