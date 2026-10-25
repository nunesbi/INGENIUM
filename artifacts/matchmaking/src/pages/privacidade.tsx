import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export default function Privacidade() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-16 border-b border-border/60 flex items-center justify-between px-4 md:px-8">
        <Link href="/" className="font-semibold text-lg flex items-center gap-2">
          <ArrowLeft size={16} className="text-muted-foreground" />
          <Logo height={26} />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 max-w-3xl mx-auto px-4 md:px-8 py-12">
        <div className="flex items-center gap-3 mb-2 text-brand">
          <ShieldCheck size={20} />
          <span className="text-xs uppercase tracking-wider font-semibold">Política de privacidade</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Sua privacidade é prioridade</h1>
        <p className="text-muted-foreground mb-8">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}. Em conformidade com LGPD (Lei nº 13.709/2018),
          GDPR (Regulamento UE 2016/679) e CCPA (California Consumer Privacy Act).
        </p>

        <Section title="1. Quem somos">
          <p>Ingenium Real Estate Intelligence Ltda. (CNPJ XX.XXX.XXX/0001-XX), operadora da plataforma de matchmaking imobiliário, atua como <b>controladora</b> dos dados pessoais coletados.</p>
          <p>Encarregado de Proteção de Dados (DPO): <span className="text-brand">dpo@ingenium.io</span></p>
        </Section>

        <Section title="2. Dados que coletamos">
          <ul className="list-disc pl-5 space-y-1">
            <li>Identificação: nome, e-mail corporativo, telefone, CNPJ.</li>
            <li>Perfil de negócio: papel (fundo/ativo), segmento, tese ou descrição do projeto.</li>
            <li>Documentos da empresa enviados ao seu critério (regulamentos, prospectos, viabilidade etc.).</li>
            <li>Dados de uso: páginas visitadas, ações executadas (apenas se você consentir com análise).</li>
            <li>Cookies essenciais (sempre ativos), análise e marketing (opt-in).</li>
          </ul>
        </Section>

        <Section title="3. Base legal (LGPD art. 7º / GDPR art. 6)">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Execução de contrato</b> — para operar a conta e entregar matches.</li>
            <li><b>Consentimento</b> — para marketing, análises e cookies não essenciais.</li>
            <li><b>Obrigação legal</b> — para retenção fiscal e regulatória (CVM, ANBIMA, BACEN quando aplicável).</li>
            <li><b>Legítimo interesse</b> — para prevenção de fraudes e segurança da plataforma.</li>
          </ul>
        </Section>

        <Section title="4. Seus direitos">
          <p>A qualquer momento, você pode exercer os seguintes direitos garantidos por LGPD, GDPR e CCPA:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Acesso e portabilidade dos seus dados (exportação em JSON).</li>
            <li>Correção de dados incompletos ou desatualizados.</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
            <li>Revogação do consentimento a qualquer momento.</li>
            <li>Oposição a tratamentos baseados em legítimo interesse.</li>
            <li>Informação sobre compartilhamento com terceiros.</li>
            <li>(CCPA) "Do Not Sell My Personal Information" — não vendemos dados pessoais.</li>
          </ul>
          <p>Acesse <Link href="/configuracoes" className="text-brand hover:underline">Configurações → Privacidade & Dados</Link> para exportar ou excluir.</p>
        </Section>

        <Section title="5. Compartilhamento">
          <p>Compartilhamos dados apenas com (i) prestadores de infraestrutura sob acordo de confidencialidade, (ii) contrapartes em deals quando você explicitamente autoriza (data room), e (iii) autoridades quando legalmente requerido.</p>
        </Section>

        <Section title="6. Segurança">
          <ul className="list-disc pl-5 space-y-1">
            <li>Criptografia TLS 1.3 em trânsito e AES-256 em repouso.</li>
            <li>Controle de acesso por papel (admin / fundo / ativo) com princípio do menor privilégio.</li>
            <li>Auditoria de acessos e logs imutáveis.</li>
            <li>Pen-tests periódicos e bug bounty.</li>
          </ul>
        </Section>

        <Section title="7. Retenção">
          <p>Dados de conta são mantidos enquanto a conta existir. Após exclusão (solicitada ou inativa por 24 meses), dados são anonimizados em até 30 dias, exceto quando obrigatória retenção fiscal (5 anos).</p>
        </Section>

        <Section title="8. Transferência internacional">
          <p>Quando processamos dados fora do Brasil/UE, exigimos cláusulas-padrão de proteção (SCCs) e países com nível adequado conforme decisões da ANPD/EDPB.</p>
        </Section>

        <Section title="9. Contato">
          <p className="flex items-center gap-2">
            <Mail size={14} className="text-brand" />
            Dúvidas? Fale com nosso DPO: <span className="text-brand">dpo@ingenium.io</span>
          </p>
          <p>Você também pode reclamar diretamente à ANPD (Brasil), CNIL/sua DPA local (UE) ou ao California AG (EUA).</p>
        </Section>

        <div className="mt-10 pt-6 border-t border-border/40 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-brand">← Voltar ao site</Link>
          <span className="mx-3">·</span>
          <Link href="/termos" className="hover:text-brand">Termos de uso</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
