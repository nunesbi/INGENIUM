import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, ShieldCheck, Briefcase, Building2, Loader2 } from "lucide-react";

type Role = "admin" | "fundo" | "ativo";
type Filter = "all" | Role;

interface AdminUser {
  id: string;
  email: string | null;
  role: Role;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  cnpj: string | null;
  phone: string | null;
  segment: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  documentsCount: number;
}

interface AdminUsersResponse {
  users: AdminUser[];
  totals: { users: number; funds: number; matches: number; assets: number };
}

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  fundo: "Fundo",
  ativo: "Incorporadora",
};

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  admin: ShieldCheck,
  fundo: Briefcase,
  ativo: Building2,
};

function displayName(u: AdminUser) {
  return (
    u.name?.trim() ||
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
    u.email ||
    u.id
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminUsuarios() {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: AdminUsersResponse = await r.json();
      setData(d);
    } catch (err) {
      toast({
        title: "Erro ao carregar usuários",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(id: string, role: Role) {
    setSavingId(id);
    try {
      const r = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: "Permissão atualizada" });
      await load();
    } catch (err) {
      toast({ title: "Erro ao atualizar", description: String(err), variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.users.filter((u) => {
      if (filter !== "all" && u.role !== filter) return false;
      if (!q) return true;
      return (
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.company ?? "").toLowerCase().includes(q) ||
        (u.cnpj ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const c = { all: 0, admin: 0, fundo: 0, ativo: 0 };
    if (!data) return c;
    c.all = data.users.length;
    for (const u of data.users) {
      if (u.role === "admin") c.admin++;
      else if (u.role === "fundo") c.fundo++;
      else if (u.role === "ativo") c.ativo++;
    }
    return c;
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Usuários cadastrados"
        description="Gestão de contas, permissões e atividade da rede Ingenium."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Total" value={counts.all} icon={Users} />
        <KpiTile label="Admins" value={counts.admin} icon={ShieldCheck} />
        <KpiTile label="Fundos" value={counts.fundo} icon={Briefcase} />
        <KpiTile label="Incorporadoras" value={counts.ativo} icon={Building2} />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, email, empresa, CNPJ…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all", "admin", "fundo", "ativo"] as Filter[]).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "Todos" : ROLE_LABEL[f as Role]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <Card>
          <CardContent className="p-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Nenhum usuário encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const Icon = ROLE_ICON[u.role];
            return (
              <Card key={u.id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium truncate">{displayName(u)}</span>
                          <Badge variant="outline" className="text-xs">{ROLE_LABEL[u.role]}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {u.email ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {u.company && <span>🏢 {u.company}</span>}
                          {u.cnpj && <span>CNPJ {u.cnpj}</span>}
                          {u.phone && <span>📞 {u.phone}</span>}
                          {u.segment && <span>Segmento: {u.segment}</span>}
                          <span>Cadastrado: {formatDate(u.createdAt)}</span>
                          <span>Docs: {u.documentsCount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={u.role}
                        onValueChange={(v) => changeRole(u.id, v as Role)}
                        disabled={savingId === u.id}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="fundo">Fundo</SelectItem>
                          <SelectItem value="ativo">Incorporadora</SelectItem>
                        </SelectContent>
                      </Select>
                      {savingId === u.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label, value, icon: Icon,
}: { label: string; value: number; icon: typeof Users }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        <Icon className="h-6 w-6 text-muted-foreground/70" />
      </CardContent>
    </Card>
  );
}
