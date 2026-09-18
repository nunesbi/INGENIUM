import { Link } from "wouter";
import { ShieldCheck } from "lucide-react";

export function LegalFooter() {
  return (
    <footer className="mt-12 pt-6 border-t border-border/40 text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={12} className="text-brand" />
        <span>
          Dados protegidos sob LGPD, GDPR e CCPA. Criptografia em trânsito e em repouso.
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/privacidade" className="hover:text-brand transition-colors" data-testid="footer-privacy">Privacidade</Link>
        <Link href="/termos" className="hover:text-brand transition-colors" data-testid="footer-terms">Termos</Link>
        <Link href="/configuracoes" className="hover:text-brand transition-colors" data-testid="footer-rights">Meus dados</Link>
      </div>
    </footer>
  );
}
