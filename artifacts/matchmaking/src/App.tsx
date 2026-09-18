import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AuthProvider, useAuth, type UserRole } from "@/lib/auth";
import { CookieConsent } from "@/components/cookie-consent";
import NotFound from "@/pages/not-found";

// Public pages
import Landing from "@/pages/landing";
import ServiceDetail from "@/pages/service-detail";
import Login from "@/pages/login";
import Cadastro from "@/pages/cadastro";
import Privacidade from "@/pages/privacidade";
import Termos from "@/pages/termos";

// App pages
import Area from "@/pages/area";
import Configuracoes from "@/pages/configuracoes";
import Documentos from "@/pages/documentos";
import Dashboard from "@/pages/dashboard";
import Funds from "@/pages/funds";
import FundDetail from "@/pages/fund-detail";
import Assets from "@/pages/assets";
import AssetDetail from "@/pages/asset-detail";
import Matches from "@/pages/matches";
import MatchDetail from "@/pages/match-detail";
import Chat from "@/pages/chat";
import Assistant from "@/pages/assistant";
import Rede from "@/pages/rede";
import OnboardingOperacao from "@/pages/onboarding-operacao";

// Admin pages
import AdminMatches from "@/pages/admin-matches";
import AdminDocuments from "@/pages/admin-documents";
import AdminCadastros from "@/pages/admin-cadastros";
import AdminUsuarios from "@/pages/admin-usuarios";
import AdminInteresses from "@/pages/admin-interesses";

const queryClient = new QueryClient();

function ProtectedRoute({
  component: Component,
  deny,
}: {
  component: React.ComponentType;
  deny?: UserRole[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Carregando…
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (deny && deny.includes(user.role)) {
    return <Redirect to="/area" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      {/* ========================================================= */}
      {/* PUBLIC SITE */}
      {/* ========================================================= */}

      <Route path="/" component={Landing} />

      <Route path="/servicos/:slug" component={ServiceDetail} />

      <Route path="/login">
        {() => <PublicOnly component={Login} />}
      </Route>

      <Route path="/cadastro">
        {() => <PublicOnly component={Cadastro} />}
      </Route>

      <Route path="/privacidade" component={Privacidade} />

      <Route path="/termos" component={Termos} />

      {/* ========================================================= */}
      {/* PROTECTED PLATFORM */}
      {/* ========================================================= */}

      <Route path="/area">
        {() => <ProtectedRoute component={Area} />}
      </Route>

      <Route path="/configuracoes">
        {() => <ProtectedRoute component={Configuracoes} />}
      </Route>

      <Route path="/documentos">
        {() => <ProtectedRoute component={Documentos} />}
      </Route>

      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>

      {/* ========================================================= */}
      {/* FUNDS */}
      {/* ========================================================= */}

      {/*
        Catálogo de fundos permanece restrito.

        Fundos não veem outros fundos.
        Ativos não acessam diretamente o catálogo de fundos.
        A descoberta de fundos pelo ativo acontece através do
        fluxo de matching/curadoria.
      */}

      <Route path="/funds">
        {() => (
          <ProtectedRoute
            component={Funds}
            deny={["fundo", "ativo"]}
          />
        )}
      </Route>

      <Route path="/funds/:id">
        {() => (
          <ProtectedRoute
            component={FundDetail}
            deny={["fundo", "ativo"]}
          />
        )}
      </Route>

      {/* ========================================================= */}
      {/* ASSETS / OPERAÇÕES */}
      {/* ========================================================= */}

      {/*
        Fundos podem explorar as operações disponíveis.

        Ativos não são bloqueados aqui porque precisam acessar
        suas próprias operações.
      */}

      <Route path="/assets">
        {() => (
          <ProtectedRoute
            component={Assets}
            deny={["ativo"]}
          />
        )}
      </Route>

      <Route path="/assets/:id">
        {() => <ProtectedRoute component={AssetDetail} />}
      </Route>

      {/* ========================================================= */}
      {/* MATCHING */}
      {/* ========================================================= */}

      <Route path="/matches">
        {() => <ProtectedRoute component={Matches} />}
      </Route>

      <Route path="/matches/:id">
        {() => <ProtectedRoute component={MatchDetail} />}
      </Route>

      {/* ========================================================= */}
      {/* COMUNICAÇÃO / IA / REDE */}
      {/* ========================================================= */}

      <Route path="/chat">
        {() => <ProtectedRoute component={Chat} />}
      </Route>

      <Route path="/assistant">
        {() => <ProtectedRoute component={Assistant} />}
      </Route>

      <Route path="/rede">
        {() => <ProtectedRoute component={Rede} />}
      </Route>

      {/* ========================================================= */}
      {/* ONBOARDING */}
      {/* ========================================================= */}

      <Route path="/onboarding-operacao">
        {() => (
          <ProtectedRoute
            component={OnboardingOperacao}
            deny={["fundo"]}
          />
        )}
      </Route>

      {/* ========================================================= */}
      {/* ADMIN — CURADORIA */}
      {/* ========================================================= */}

      <Route path="/admin/matches">
        {() => (
          <ProtectedRoute
            component={AdminMatches}
            deny={["fundo", "ativo"]}
          />
        )}
      </Route>

      <Route path="/admin/interesses">
        {() => (
          <ProtectedRoute
            component={AdminInteresses}
            deny={["fundo", "ativo"]}
          />
        )}
      </Route>

      <Route path="/admin/documentos">
        {() => (
          <ProtectedRoute
            component={AdminDocuments}
            deny={["fundo", "ativo"]}
          />
        )}
      </Route>

      <Route path="/admin/cadastros">
        {() => (
          <ProtectedRoute
            component={AdminCadastros}
            deny={["fundo", "ativo"]}
          />
        )}
      </Route>

      <Route path="/admin/usuarios">
        {() => (
          <ProtectedRoute
            component={AdminUsuarios}
            deny={["fundo", "ativo"]}
          />
        )}
      </Route>

      {/* ========================================================= */}
      {/* 404 */}
      {/* ========================================================= */}

      <Route component={NotFound} />
    </Switch>
  );
}

function PublicOnly({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user) {
    return <Redirect to="/area" />;
  }

  return <Component />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter
            base={import.meta.env.BASE_URL.replace(/\/$/, "")}
          >
            <Router />
          </WouterRouter>

          <Toaster />

          <CookieConsent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;