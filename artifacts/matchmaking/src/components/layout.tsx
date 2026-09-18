import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Briefcase,
  LayoutDashboard,
  FileText,
  Activity,
  MessageSquare,
  Sparkles,
  Menu,
  X,
  ArrowLeft,
  Home,
  Settings,
  LogOut,
  Building2,
  FolderArchive,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { useAuth, docsProgress, UserRole } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface LayoutProps {
  children: ReactNode;
}

type NavItem = { href: string; label: string; icon: any; highlight?: boolean; badge?: string };

function navForRole(role: UserRole, docsMissing: number, t: (k: string, fb: string) => string): NavItem[] {
  if (role === "admin") {
    return [
      { href: "/dashboard", label: t("side.dashboard", "Dashboard"), icon: LayoutDashboard },
      { href: "/assistant", label: t("side.assistant", "Assistente IA"), icon: Sparkles, highlight: true },
      { href: "/funds", label: t("side.funds", "Fundos"), icon: Briefcase },
      { href: "/assets", label: t("side.ops", "Operações"), icon: FileText },
      { href: "/admin/cadastros", label: t("side.register", "Cadastrar fundo/ativo"), icon: Building2 },
      { href: "/admin/matches", label: t("side.curate", "Curar matches"), icon: Sparkles },
      { href: "/admin/documentos", label: t("side.docsSent", "Documentos enviados"), icon: FolderArchive },
      { href: "/matches", label: t("side.matchesGen", "Matches gerados"), icon: Activity },
      { href: "/chat", label: t("side.chat", "Chat"), icon: MessageSquare },
    ];
  }
  if (role === "fundo") {
    return [
      { href: "/area", label: t("side.myArea", "Minha área"), icon: Home },
      { href: "/assistant", label: t("side.copilot", "Copilot do empreendedor"), icon: Sparkles, highlight: true },
      { href: "/matches", label: t("side.myMatches", "Meus matches"), icon: Activity },
      { href: "/assets", label: t("side.exploreOps", "Explorar operações"), icon: FileText },
      { href: "/documentos", label: t("side.docs", "Documentos"), icon: FolderArchive, badge: docsMissing ? String(docsMissing) : undefined },
      { href: "/chat", label: t("side.convs", "Conversas"), icon: MessageSquare },
    ];
  }
  return [
    { href: "/area", label: t("side.myOp", "Minha operação"), icon: Home },
    { href: "/onboarding-operacao", label: t("side.structureOp", "Estruturar operação"), icon: Building2, highlight: true },
    { href: "/assistant", label: t("side.copilot", "Copilot do empreendedor"), icon: Sparkles },
    { href: "/matches", label: t("side.interestedFunds", "Fundos interessados"), icon: Activity },
    { href: "/documentos", label: t("side.dataRoom", "Data room"), icon: FolderArchive, badge: docsMissing ? String(docsMissing) : undefined },
    { href: "/chat", label: t("side.convs", "Conversas"), icon: MessageSquare },
  ];
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useT();

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const role: UserRole = user?.role ?? "fundo";
  const { missingRequired } = docsProgress(user?.docs);
  const navItems = navForRole(role, missingRequired, t);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const initials = (user?.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = role === "admin" ? t("side.role.admin", "Administrador") : role === "fundo" ? t("side.role.fund", "Fundo") : t("side.role.asset", "Ativo");
  const RoleIcon = role === "admin" ? ShieldCheck : role === "fundo" ? Briefcase : Building2;

  const sidebar = (
    <>
      <div className="h-16 flex items-center justify-between px-6 border-b border-border/60">
        <Link href="/" className="flex items-center" data-testid="link-sidebar-logo">
          <Logo height={28} />
        </Link>
        <button
          className="md:hidden p-1 rounded hover:bg-muted/50 text-muted-foreground"
          onClick={() => setMobileOpen(false)}
          aria-label={t("side.closeMenu", "Fechar menu")}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/")) || location.startsWith(item.href);
          const isHighlight = item.highlight;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-brand/15 text-brand"
                  : isHighlight
                  ? "text-brand hover:bg-brand/10"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
              data-testid={`nav-${item.href.replace(/\//g, "-")}`}
            >
              <Icon size={18} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && !isActive && (
                <span className="text-[10px] font-semibold bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {isHighlight && !item.badge && !isActive && (
                <span className="text-[10px] font-semibold bg-brand/15 text-brand px-1.5 py-0.5 rounded-full">
                  IA
                </span>
              )}
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/60 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
          data-testid="link-back-site"
        >
          <ArrowLeft size={12} /> {t("side.back", "Voltar ao site")}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors"
              data-testid="button-user-menu"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d6972b] to-[#b8801f] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0 flex-1 text-left">
                <span className="text-sm font-medium leading-none truncate">
                  {user?.name || t("side.user.default", "Usuário")}
                </span>
                <span className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                  <RoleIcon size={10} />
                  {roleLabel} · {user?.company}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role !== "admin" && (
              <DropdownMenuItem asChild>
                <Link href="/area" className="cursor-pointer" data-testid="menu-area">
                  <Home className="mr-2 h-4 w-4" /> {t("side.menu.area", "Minha área")}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/configuracoes" className="cursor-pointer" data-testid="menu-config">
                <Settings className="mr-2 h-4 w-4" /> {t("side.menu.config", "Configurações")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer" data-testid="menu-logout">
              <LogOut className="mr-2 h-4 w-4" /> {t("side.menu.logout", "Sair")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden md:flex w-64 border-r border-border/60 bg-card flex-shrink-0 flex-col">
        {sidebar}
      </aside>

      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed inset-y-0 left-0 w-64 border-r border-border/60 bg-card z-50 flex flex-col">
            {sidebar}
          </aside>
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border/60 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-8 flex-shrink-0 gap-3">
          <button
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted/60 text-muted-foreground flex-shrink-0"
            onClick={() => setMobileOpen(true)}
            aria-label={t("side.openMenu", "Abrir menu")}
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3 flex-1">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("side.header.online", "Plataforma online")}
            </span>
            {role === "admin" && (
              <Badge variant="outline" className="hidden sm:inline-flex bg-brand/10 text-brand border-brand/30 text-[10px] gap-1">
                <ShieldCheck size={10} /> {t("side.header.adminView", "Visão admin")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/configuracoes"
              className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("side.settings", "Configurações")}
              data-testid="header-settings"
            >
              <Settings size={18} />
            </Link>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
