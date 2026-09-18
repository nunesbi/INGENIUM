import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export default function Termos() {
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
          <FileText size={20} />
          <span className="text-xs uppercase tracking-wider font-semibold">Termos de uso</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Termos de uso da plataforma</h1>
        <p className="text-muted-foreground mb-8">Vigência: {new Date().toLocaleDateString("pt-BR")}</p>

        <Section title="1. Aceitação">
          <p>Ao criar uma conta na Ingenium você concorda com estes termos e com nossa <Link href="/privacidade" className="text-brand hover:underline">Política de Privacidade</Link>.</p>
        </Section>

        <Section title="2. Natureza do serviço">
          <p>A Ingenium é uma plataforma de inteligência e matchmaking que conecta fundos a ativos imobiliários. <b>Não somos corretora, consultora de valores mobiliários ou instituição financeira</b>. Decisões de alocação são responsabilidade exclusiva das partes.</p>
        </Section>

        <Section title="3. Conta e elegibilidade">
          <ul className="list-disc pl-5 space-y-1">
            <li>Apenas pessoas jurídicas com legitimidade para atuar em deals imobiliários.</li>
            <li>Você é responsável pela veracidade das informações e documentos enviados.</li>
            <li>É proibido compartilhar credenciais ou criar contas em nome de terceiros sem autorização.</li>
          </ul>
        </Section>

        <Section title="4. Uso aceitável">
          <ul className="list-disc pl-5 space-y-1">
            <li>Não é permitido extrair dados de outros usuários por scraping ou engenharia reversa.</li>
            <li>Conteúdos ilícitos, difamatórios ou que violem direitos de terceiros podem ser removidos.</li>
            <li>Tentativas de burlar controles de acesso resultam em suspensão imediata.</li>
          </ul>
        </Section>

        <Section title="5. Propriedade intelectual">
          <p>A marca, software, scoring e materiais são de propriedade da Ingenium. Documentos enviados por você permanecem seus — concedemos licença limitada para operar a plataforma e exibir ao público autorizado por você.</p>
        </Section>

        <Section title="6. Limitação de responsabilidade">
          <p>A Ingenium não responde por perdas decorrentes de decisões de investimento, indisponibilidades pontuais, ou conteúdo enviado por usuários. Faremos esforços razoáveis para manter a plataforma estável e segura.</p>
        </Section>

        <Section title="7. Cancelamento">
          <p>Você pode cancelar sua conta a qualquer momento em <Link href="/configuracoes" className="text-brand hover:underline">Configurações → Privacidade & Dados</Link>. Após cancelamento, seus dados serão excluídos conforme nossa Política de Privacidade.</p>
        </Section>

        <Section title="8. Foro e legislação">
          <p>Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de São Paulo/SP, com renúncia a qualquer outro.</p>
        </Section>

        <div className="mt-10 pt-6 border-t border-border/40 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-brand">← Voltar ao site</Link>
          <span className="mx-3">·</span>
          <Link href="/privacidade" className="hover:text-brand">Política de privacidade</Link>
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
