import { useMemo, useState, useEffect } from "react";
import { useListFunds, useListAssets } from "@workspace/api-client-react";
import {
  useAuth, getAdminMatches, saveAdminMatch, deleteAdminMatch, checkDocsReady,
  getRegistryAccountsByRole, syntheticIdFromName, REGISTRY_EVENT,
  type AdminMatch, type DocsCheck, type AuthUser,
} from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Briefcase, Building2, ArrowRight, ShieldCheck, Trash2, Search, Lock,
  CheckCircle2, AlertTriangle, FileText,
} from "lucide-react";

export default function AdminMatches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: funds, isLoading: loadingFunds } = useListFunds();
  const { data: assets, isLoading: loadingAssets } = useListAssets();

  const [fundId, setFundId] = useState<string>("");
  const [assetId, setAssetId] = useState<string>("");
  const [score, setScore] = useState<string>("85");
  const [note, setNote] = useState<string>("");
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [search, setSearch] = useState("");
  const [registryTick, setRegistryTick] = useState(0);

  useEffect(() => { setMatches(getAdminMatches()); }, []);

  // Re-read registry whenever a new fundo/ativo account is created (same tab via
  // custom event, other tabs via the native storage event).
  useEffect(() => {
    const bump = () => setRegistryTick((t) => t + 1);
    window.addEventListener(REGISTRY_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(REGISTRY_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  type Option = { id: number; nome: string; source: "api" | "registry"; account?: AuthUser; subtitle?: string };
  const norm = (s: string) => s.trim().toLowerCase();

  // Dedup registry users by normalized company name (keep most recent).
  // `getRegistryAccountsByRole` already returns descending by createdAt.
  const dedupByCompany = (users: AuthUser[]): AuthUser[] => {
    const seen = new Set<string>();
    const out: AuthUser[] = [];
    for (const u of users) {
      const k = norm(u.company);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(u);
    }
    return out;
  };

  const fundOptions: Option[] = useMemo(() => {
    const apiOpts: Option[] = (funds ?? []).map((f) => ({
      id: f.id,
      nome: f.nome,
      source: "api",
      subtitle: `Ticket R$ ${(f.ticketMin / 1_000_000).toFixed(0)}M–${(f.ticketMax / 1_000_000).toFixed(0)}M · ROI mín ${f.roiMinimo}%`,
    }));
    const apiNames = new Set(apiOpts.map((o) => norm(o.nome)));
    const regOpts: Option[] = dedupByCompany(getRegistryAccountsByRole("fundo"))
      .filter((u) => !apiNames.has(norm(u.company)))
      .map((u) => ({
        id: syntheticIdFromName(u.company),
        nome: u.company,
        source: "registry",
        account: u,
        subtitle: `Cadastrado por ${u.name} · ${new Date(u.createdAt).toLocaleDateString("pt-BR")}`,
      }));
    return [...regOpts, ...apiOpts];
    // registryTick forces recompute when a new account is created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funds, registryTick]);

  const assetOptions: Option[] = useMemo(() => {
    const apiOpts: Option[] = (assets ?? []).map((a) => ({
      id: a.id,
      nome: a.nome,
      source: "api",
      subtitle: `Captação R$ ${(a.valorCaptacao / 1_000_000).toFixed(0)}M · ROI prev. ${a.roiPrevisto}% · ${a.tipoAtivo}`,
    }));
    const apiNames = new Set(apiOpts.map((o) => norm(o.nome)));
    const regOpts: Option[] = dedupByCompany(getRegistryAccountsByRole("ativo"))
      .filter((u) => !apiNames.has(norm(u.company)))
      .map((u) => ({
        id: syntheticIdFromName(u.company),
        nome: u.company,
        source: "registry",
        account: u,
        subtitle: `Cadastrado por ${u.name} · ${new Date(u.createdAt).toLocaleDateString("pt-BR")}`,
      }));
    return [...regOpts, ...apiOpts];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, registryTick]);

  const selectedFund = useMemo(
    () => fundOptions.find((f) => String(f.id) === fundId),
    [fundOptions, fundId],
  );
  const selectedAsset = useMemo(
    () => assetOptions.find((a) => String(a.id) === assetId),
    [assetOptions, assetId],
  );

  const fundDocs: DocsCheck | null = useMemo(
    () => (selectedFund ? checkDocsReady(selectedFund.nome, "fundo", selectedFund.id) : null),
    [selectedFund],
  );
  const assetDocs: DocsCheck | null = useMemo(
    () => (selectedAsset ? checkDocsReady(selectedAsset.nome, "ativo", selectedAsset.id) : null),
    [selectedAsset],
  );
  const canCreate = !!(selectedFund && selectedAsset && fundDocs?.ok && assetDocs?.ok);

  const handleCreate = () => {
    if (!selectedFund || !selectedAsset) {
      toast({ title: "Selecione fundo e ativo", variant: "destructive" });
      return;
    }
    if (!fundDocs?.ok || !assetDocs?.ok) {
      toast({
        title: "Documentação obrigatória pendente",
        description: "Ambas as partes precisam ter todos os documentos obrigatórios enviados antes do match.",
        variant: "destructive",
      });
      return;
    }
    const n = Number(score);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      toast({ title: "Score deve estar entre 0 e 100", variant: "destructive" });
      return;
    }
    const m: AdminMatch = {
      id: crypto.randomUUID(),
      fundId: selectedFund.id,
      fundName: selectedFund.nome,
      assetId: selectedAsset.id,
      assetName: selectedAsset.nome,
      score: Math.round(n),
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
      createdBy: user?.email ?? "admin",
    };
    saveAdminMatch(m);
    setMatches(getAdminMatches());
    setAssetId(""); setNote(""); setScore("85");
    toast({ title: "Match criado", description: `${m.fundName} ↔ ${m.assetName}` });
  };

  const handleDelete = (id: string) => {
    deleteAdminMatch(id);
    setMatches(getAdminMatches());
    toast({ title: "Match removido" });
  };

  const filtered = matches.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.fundName.toLowerCase().includes(q) || m.assetName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curadoria de Matches"
        description="Crie conexões manuais entre fundos e ativos. Por LGPD, apenas administradores podem pareá-los."
        actions={
          <a href="/admin/cadastros">
            <Button variant="outline" className="gap-2" data-testid="link-admin-cadastros">
              <Building2 size={14} /> Cadastrar fundo/ativo
            </Button>
          </a>
        }
      />

      {/* LGPD notice */}
      <Card className="border-brand/20 bg-brand/5">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck size={18} className="text-brand flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <b className="text-foreground">Curadoria humana · LGPD / GDPR / CCPA.</b> Fundos e ativos não se conectam diretamente.
            Toda introdução é mediada pela equipe Ingenium para preservar a privacidade das partes até consentimento mútuo.
          </div>
        </CardContent>
      </Card>

      {/* Create form */}
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand" />
            <h3 className="font-semibold text-sm">Novo match</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Briefcase size={12} className="text-brand" /> Fundo
              </Label>
              <Select value={fundId} onValueChange={setFundId} disabled={loadingFunds}>
                <SelectTrigger data-testid="select-fund"><SelectValue placeholder={loadingFunds ? "Carregando…" : "Selecione um fundo"} /></SelectTrigger>
                <SelectContent>
                  {fundOptions.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      <span className="inline-flex items-center gap-2">
                        {f.nome}
                        {f.source === "registry" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-brand/40 text-brand">Cadastrado</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFund?.subtitle && (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 mt-1">
                  {selectedFund.subtitle}
                </div>
              )}
              {selectedFund && fundDocs && <DocsStatus check={fundDocs} label="fundo" />}
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Building2 size={12} className="text-brand" /> Ativo
              </Label>
              <Select value={assetId} onValueChange={setAssetId} disabled={loadingAssets}>
                <SelectTrigger data-testid="select-asset"><SelectValue placeholder={loadingAssets ? "Carregando…" : "Selecione um ativo"} /></SelectTrigger>
                <SelectContent>
                  {assetOptions.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      <span className="inline-flex items-center gap-2">
                        {a.nome}
                        {a.source === "registry" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-brand/40 text-brand">Cadastrado</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAsset?.subtitle && (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 mt-1">
                  {selectedAsset.subtitle}
                </div>
              )}
              {selectedAsset && assetDocs && <DocsStatus check={assetDocs} label="ativo" />}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-xs">Score de compatibilidade (0–100)</Label>
              <Input
                type="number" min={0} max={100}
                value={score} onChange={(e) => setScore(e.target.value)}
                data-testid="input-score"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Justificativa (opcional)</Label>
              <Textarea
                placeholder="Ex: tese aderente, ticket dentro do range, segmento compatível…"
                value={note} onChange={(e) => setNote(e.target.value)}
                rows={2} data-testid="input-note"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock size={11} className="text-brand" />
              Match só é liberado quando ambas as partes têm todos os documentos obrigatórios.
            </p>
            <Button
              onClick={handleCreate}
              disabled={!canCreate}
              className="bg-brand hover:bg-brand/90 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-create-match"
            >
              Criar match <ArrowRight size={14} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm">Matches curados</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{matches.length} no total</p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar fundo ou ativo…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-56" data-testid="input-search-matches"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {matches.length === 0
                ? "Nenhum match criado ainda. Use o formulário acima para começar."
                : "Nenhum resultado para essa busca."}
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((m) => (
                <div key={m.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand flex-shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{m.fundName}</span>
                      <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{m.assetName}</span>
                    </div>
                    {m.note && <div className="text-xs text-muted-foreground mt-0.5 truncate">{m.note}</div>}
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                      <Lock size={9} /> Criado por {m.createdBy} · {new Date(m.createdAt).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      m.score >= 85
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : m.score >= 70
                        ? "bg-brand/10 text-brand border-brand/30"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    Score {m.score}
                  </Badge>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleDelete(m.id)}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid={`delete-match-${m.id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DocsStatus({ check, label }: { check: DocsCheck; label: string }) {
  if (check.ok) {
    if (check.viaAdminCuration || !check.user) {
      return (
        <div className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mt-1">
          <CheckCircle2 size={12} className="flex-shrink-0" />
          <span className="truncate"><b>Documentação verificada offline pelo admin</b></span>
        </div>
      );
    }
    const total = check.user.docs?.length ?? 0;
    const uploaded = check.user.docs?.filter((d) => d.status === "uploaded").length ?? 0;
    return (
      <div className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mt-1">
        <CheckCircle2 size={12} className="flex-shrink-0" />
        <span className="truncate"><b>Documentação completa</b> · {uploaded}/{total} enviados</span>
      </div>
    );
  }
  if (check.reason === "no-user") {
    return (
      <div className="text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-1">
        <AlertTriangle size={12} className="flex-shrink-0" />
        <span>Sem conta cadastrada. Use <b>Cadastrar fundo/ativo</b> para registrar e validar docs offline.</span>
      </div>
    );
  }
  return (
    <div className="text-xs flex items-center gap-1.5 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 mt-1">
      <FileText size={12} className="flex-shrink-0" />
      <span>
        <b>Bloqueado:</b> {check.missing} documento{check.missing! > 1 ? "s" : ""} obrigatório{check.missing! > 1 ? "s" : ""} pendente{check.missing! > 1 ? "s" : ""}.
      </span>
    </div>
  );
}
