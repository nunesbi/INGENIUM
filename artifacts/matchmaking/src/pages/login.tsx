import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { useT } from "@/lib/i18n";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t("login.err.fill", "Preencha e-mail e senha."));
      return;
    }
    setLoading(true);
    try {
      const u = await login(email, password);
      setLocation(u.role === "fundo" ? "/area" : "/area");
    } catch (err) {
      setError(
        t("login.err.fail", "Não foi possível entrar. Tente novamente."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-border/60">
        <Link
          href="/"
          className="flex items-center gap-2"
          data-testid="link-logo"
        >
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
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              {t("login.title", "Entrar")}
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {t("login.subtitle", "Acesse sua área Ingenium.")}
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="bg-card border border-border/60 rounded-xl shadow-sm p-6 space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email", "E-mail")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("login.password", "Senha")}</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-brand"
                  onClick={() =>
                    alert(t("login.forgot.soon", "Funcionalidade em breve."))
                  }
                >
                  {t("login.forgot", "Esqueci a senha")}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                data-testid="input-password"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-brand hover:bg-brand/90 text-white"
              disabled={loading}
              data-testid="button-submit-login"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("login.submit", "Entrar")
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-2 border-t border-border/40">
              {t("login.noAccount", "Ainda não tem conta?")}{" "}
              <Link
                href="/cadastro"
                className="text-brand font-medium hover:underline"
                data-testid="link-signup"
              >
                {t("login.signupLink", "Cadastre-se")}
              </Link>
            </div>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {t(
              "login.security",
              "Suas credenciais são protegidas com criptografia bcrypt e sessões httpOnly.",
            )}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
