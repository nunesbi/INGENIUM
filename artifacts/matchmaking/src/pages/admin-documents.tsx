import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import {
  Briefcase, Building2, ChevronDown, ChevronRight, Check, FileText,
  Search, ShieldCheck, Lock, Users, Download,
} from "lucide-react";

type Role = "fundo" | "ativo" | "admin";
type Filter = "all" | Role;

interface ServerDoc {
  id: number;
  ownerEmail: string;
  ownerRole: Role;
  ownerName: string | null;
  ownerCompany: string | null;
  docKey: string;
  docName: string;
  required: boolean;
  fileName: string;
  fileSize: number;
  contentType: string | null;
  objectPath: string;
  createdAt: string;
}

interface OwnerGroup {
  email: string;
  role: Role;
  name: string;
  company: string;
  docs: ServerDoc[];
  uploaded: number;
  total: number;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function serveUrl(objectPath: string) {
  // objectPath already starts with /objects/...
  return `/api/storage${objectPath}`;
}

export default function AdminDocuments() {
  const [docs, setDocs] = useState<ServerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/documents");
        if (!r.ok) throw new Error("Failed");
        const data: ServerDoc[] = await r.json();
        if (!cancelled) setDocs(data);
      } catch {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const groups: OwnerGroup[] = useMemo(() => {
    const map = new Map<string, OwnerGroup>();
    for (const d of docs) {
      const g = map.get(d.ownerEmail);
      if (g) {
        g.docs.push(d);
        g.uploaded++;
        g.total++;
      } else {
        map.set(d.ownerEmail, {
          email: d.ownerEmail,
          role: d.ownerRole,
          name: d.ownerName ?? "—",
          company: d.ownerCompany ?? "—",
          docs: [d],
          uploaded: 1,
          total: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.company.localeCompare(b.company));
  }, [docs]);

  const filtered = useMemo(() => {
    let r = groups;
    if (filter !== "all") r = r.filter((g) => g.role === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((g) =>
        g.email.toLowerCase().includes(q) ||
        g.company.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q),
      );
    }
    return r;
  }, [groups, filter, search]);

  const totals = useMemo(() => {
    const fundos = groups.filter((g) => g.role === "fundo").length;
    const ativos = groups.filter((g) => g.role === "ativo").length;
    const uploaded = docs.length;
    return { fundos, ativos, uploaded };
  }, [groups, docs]);

  const toggle = (email: string) => {
    const next = new Set(expanded);
    if (next.has(email)) next.delete(email); else next.add(email);
    setExpanded(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos enviados"
        description="Auditoria centralizada de todos os documentos compartilhados por fundos e ativos cadastrados."
      />

      {/* LGPD notice */}
      <Card className="border-brand/20 bg-brand/5">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck size={18} className="text-brand flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <b className="text-foreground">Visualização restrita à curadoria · LGPD / GDPR / CCPA.</b>{" "}
            Documentos são acessados apenas para validação e curadoria de matches. Cada acesso é auditável e os arquivos
            permanecem criptografados (TLS 1.3 / AES-256).
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Contas com docs" value={String(groups.length)} />
        <Kpi icon={Briefcase} label="Fundos" value={String(totals.fundos)} />
        <Kpi icon={Building2} label="Ativos" value={String(totals.ativos)} />
        <Kpi icon={FileText} label="Docs enviados" value={String(totals.uploaded)} />
      </div>

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex gap-2">
            {([
              ["all", "Todos"],
              ["fundo", "Fundos"],
              ["ativo", "Ativos"],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilter(k as Filter)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === k
                    ? "bg-brand text-white border-brand"
                    : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`filter-${k}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, empresa ou email…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9" data-testid="input-search-docs"
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <Card className="border-border/60">
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Carregando documentos…
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            {groups.length === 0
              ? "Nenhum documento enviado ainda. Quando fundos ou ativos fizerem upload, aparecerão aqui."
              : "Nenhum resultado para os filtros aplicados."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const isOpen = expanded.has(g.email);
            const Icon = g.role === "fundo" ? Briefcase : Building2;
            return (
              <Card key={g.email} className="border-border/60 overflow-hidden">
                <button
                  onClick={() => toggle(g.email)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                  data-testid={`user-${g.email}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand flex-shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm truncate">{g.company}</div>
                      <Badge variant="outline" className="text-[10px] capitalize">{g.role}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{g.name} · {g.email}</div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1 w-40">
                    <div className="text-[11px] text-muted-foreground">{g.uploaded} doc{g.uploaded > 1 ? "s" : ""}</div>
                    <Progress value={100} className="h-1.5 w-full" />
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  >
                    {g.uploaded} enviado{g.uploaded > 1 ? "s" : ""}
                  </Badge>
                  {isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="border-t border-border/40 divide-y divide-border/40 bg-muted/20">
                    {g.docs.map((d) => (
                      <div key={d.id} className="px-6 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-500/10 text-emerald-500">
                          <Check size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{d.docName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                            <Lock size={10} className="text-brand" />
                            <span className="truncate">{d.fileName}</span>
                            <span>· {formatBytes(d.fileSize)}</span>
                            <span>· {new Date(d.createdAt).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                        <Button asChild size="sm" variant="ghost" className="gap-2 text-muted-foreground hover:text-brand">
                          <a href={serveUrl(d.objectPath)} target="_blank" rel="noopener noreferrer" data-testid={`download-${d.id}`}>
                            <Download size={14} /> <span className="hidden sm:inline">Abrir</span>
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
          <Icon size={16} />
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-lg font-bold tracking-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
