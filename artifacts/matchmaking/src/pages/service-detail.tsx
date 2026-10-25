import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SERVICES } from "./landing";

const DETAILS: Record<string, {
  hero: string;
  features: { title: string; description: string }[];
  process: string[];
}> = {
  "matchmaking": {
    hero: "Conecte sua tese de investimento ao universo certo de ativos. Nossa engine de matchmaking analisa milhares de combinações por segundo, considerando ticket, região, segmento, ROI alvo e perfil de risco.",
    features: [
      { title: "Score de compatibilidade", description: "Cada match recebe uma nota de 0 a 100 com explicação dos pontos fortes e fracos." },
      { title: "Filtros institucionais", description: "Modelo treinado com regras dos principais fundos do mercado brasileiro." },
      { title: "Pipeline contínuo", description: "Novos ativos são avaliados automaticamente contra a sua tese." },
    ],
    process: [
      "Cadastre sua tese de investimento",
      "Receba ranking de ativos compatíveis",
      "Visualize justificativas e dados-chave",
      "Inicie due diligence direto na plataforma",
    ],
  },
  "analise-carteira": {
    hero: "Visão 360° da sua carteira: exposição setorial, concentração geográfica, qualidade de inquilinos, performance histórica e benchmarking com pares.",
    features: [
      { title: "Diagnóstico em tempo real", description: "Métricas atualizadas automaticamente com dados de mercado." },
      { title: "Stress tests", description: "Simulações de cenários macro com impacto na carteira." },
      { title: "Relatórios para cotistas", description: "Templates institucionais prontos para comunicação." },
    ],
    process: [
      "Importe sua carteira (CSV ou integração)",
      "Receba diagnóstico inicial em 24h",
      "Acompanhe métricas em dashboard live",
      "Exporte relatórios institucionais",
    ],
  },
  "due-diligence": {
    hero: "Análise completa de ativos imobiliários: documental, técnica, jurídica e financeira — com relatórios padronizados e auditáveis.",
    features: [
      { title: "Checklist institucional", description: "+120 pontos de verificação alinhados às práticas dos maiores fundos." },
      { title: "Análise documental automatizada", description: "OCR e IA extraem dados de contratos, matrículas e certidões." },
      { title: "Pareceres", description: "Equipe de especialistas valida cada relatório antes da entrega." },
    ],
    process: [
      "Envie a documentação do ativo",
      "IA estrutura e classifica os documentos",
      "Especialistas revisam pontos críticos",
      "Receba relatório executivo em 7 dias úteis",
    ],
  },
  "consultoria": {
    hero: "Apoio estratégico para fundos em estruturação, captação e crescimento. Da tese de investimento ao roadshow com investidores.",
    features: [
      { title: "Estruturação de teses", description: "Definição de mandato, mercado-alvo e diferenciais competitivos." },
      { title: "Apoio à captação", description: "Materiais institucionais e introdução a investidores qualificados." },
      { title: "Governança", description: "Implementação de práticas de compliance e ESG." },
    ],
    process: [
      "Diagnóstico estratégico inicial",
      "Definição de roadmap de 90 dias",
      "Execução com sprints quinzenais",
      "Acompanhamento contínuo trimestral",
    ],
  },
};

export default function ServiceDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const service = SERVICES.find((s) => s.slug === slug);
  const detail = slug ? DETAILS[slug] : undefined;

  if (!service || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">Serviço não encontrado</h1>
          <Link href="/">
            <Button variant="outline"><ArrowLeft size={16} className="mr-2" /> Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = service.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border/50 backdrop-blur-lg bg-background/70 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold text-xl tracking-tight" data-testid="link-back-home">
            <span className="text-[#d6972b]">Ingen</span>ium
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/assistant">
              <Button size="sm" className="bg-[#d6972b] hover:bg-[#b8801f] text-white">
                Acessar Plataforma
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 md:pt-24 pb-16 px-4 md:px-8 overflow-hidden">
        <div className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br ${service.color} blur-3xl opacity-60 pointer-events-none`} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-3xl mx-auto"
        >
          <Link href="/#servicos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors" data-testid="link-back-services">
            <ArrowLeft size={14} /> Todos os serviços
          </Link>

          <div className={`inline-flex w-14 h-14 rounded-xl bg-card/80 border border-border/60 items-center justify-center ${service.accent} mb-6`}>
            <Icon size={26} />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5">{service.title}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{detail.hero}</p>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 md:px-8 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-10 text-center">O que está incluso</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {detail.features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-border/60 bg-card/40 hover:border-[#d6972b]/40 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg bg-[#d6972b]/10 ${service.accent} flex items-center justify-center mb-4`}>
                  <Check size={18} />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 px-4 md:px-8 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-10 text-center">Como funciona</h2>
          <div className="space-y-3">
            {detail.process.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4 p-5 rounded-xl border border-border/60 bg-card/40"
              >
                <div className="w-8 h-8 rounded-full bg-[#d6972b] text-white font-semibold flex items-center justify-center flex-shrink-0 text-sm">
                  {i + 1}
                </div>
                <div className="pt-1 text-base">{step}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 md:px-8 border-t border-border/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Pronto para começar?</h2>
          <p className="text-muted-foreground mb-8">Experimente a plataforma agora ou fale com nosso time.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/assistant">
              <Button size="lg" className="bg-[#d6972b] hover:bg-[#b8801f] text-white w-full sm:w-auto">
                Acessar Plataforma <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
            <Link href="/#contato">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Falar com especialista</Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
