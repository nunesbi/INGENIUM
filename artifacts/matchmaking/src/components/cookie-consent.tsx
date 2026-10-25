import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "ingenium_consent";

interface ConsentPrefs {
  essential: true; // always true
  analytics: boolean;
  marketing: boolean;
  acceptedAt: string;
}

function readConsent(): ConsentPrefs | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentPrefs) : null;
  } catch {
    return null;
  }
}

function saveConsent(p: ConsentPrefs) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setOpen(readConsent() === null);
  }, []);

  if (!open) return null;

  const finish = (analyticsV: boolean, marketingV: boolean) => {
    saveConsent({ essential: true, analytics: analyticsV, marketing: marketingV, acceptedAt: new Date().toISOString() });
    setOpen(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-4 sm:p-6 pointer-events-none">
      <div className="max-w-3xl mx-auto bg-card border border-border/60 rounded-xl shadow-2xl p-5 pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
            <Cookie size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm">Sua privacidade importa</h3>
              <button
                onClick={() => finish(false, false)}
                className="text-muted-foreground hover:text-foreground p-1 -m-1"
                aria-label="Recusar não essenciais"
                data-testid="cookie-close"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Usamos cookies essenciais para operar a plataforma e, com seu consentimento, cookies de análise e marketing.
              Conforme LGPD (Lei 13.709/18), GDPR e CCPA, você pode aceitar, recusar ou personalizar a qualquer momento.{" "}
              <Link href="/privacidade" className="text-brand hover:underline">Política de privacidade</Link>.
            </p>

            {customize && (
              <div className="mt-4 space-y-3 border-t border-border/40 pt-4">
                <ConsentRow
                  label="Cookies essenciais"
                  description="Sessão, autenticação e segurança. Não podem ser desativados."
                  checked
                  disabled
                />
                <ConsentRow
                  label="Análise de uso"
                  description="Métricas anônimas para melhorarmos a plataforma."
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <ConsentRow
                  label="Marketing"
                  description="Comunicações sobre novos recursos e oportunidades."
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              {customize ? (
                <Button onClick={() => finish(analytics, marketing)} className="bg-brand hover:bg-brand/90 text-white flex-1" data-testid="cookie-save">
                  Salvar preferências
                </Button>
              ) : (
                <>
                  <Button onClick={() => finish(true, true)} className="bg-brand hover:bg-brand/90 text-white flex-1" data-testid="cookie-accept-all">
                    Aceitar todos
                  </Button>
                  <Button onClick={() => finish(false, false)} variant="outline" className="flex-1" data-testid="cookie-essentials">
                    Apenas essenciais
                  </Button>
                  <Button onClick={() => setCustomize(true)} variant="ghost" className="sm:flex-none" data-testid="cookie-customize">
                    Personalizar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
