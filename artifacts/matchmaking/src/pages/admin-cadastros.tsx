import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  useCreateFund, useCreateAsset, useListFunds,
  getListFundsQueryKey, getListAssetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, saveAdminCurated } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Building2, ShieldCheck, Save, UserPlus, Loader2, Lock, FileCheck2,
  ArrowRight, Plus,
} from "lucide-react";

const SEGMENTOS = ["Logístico", "Residencial", "Comercial", "Hotelaria", "Industrial", "Multimercado", "Galpão"];
const REGIOES = ["São Paulo", "Rio de Janeiro", "Minas Gerais", "Paraná", "Santa Catarina", "Rio Grande do Sul", "Distrito Federal", "Bahia", "Pernambuco", "Ceará"];
const NIVEIS_RISCO = ["baixo", "medio", "alto"];
const ESTAGIOS_FUNDO = ["Captação", "Operação", "Desinvestimento"];
const ESTAGIOS_ATIVO = ["Pré-lançamento", "Captação", "Em obras", "Pronto", "Operando"];
const TIPOS_ATIVO = ["Laje Corporativa", "Galpão Logístico", "Residencial", "Hotel", "Shopping", "Multiuso", "Terreno", "Industrial"];

function ExistingFundsList() {
  const { data: funds, isLoading } = useListFunds();
  const [q, setQ] = useState("");
  const filtered = (funds ?? []).filter(
    (f) =>
      f.nome.toLowerCase().includes(q.toLowerCase()) ||
      (f.cnpj ?? "").includes(q) ||
      (f.ticker ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Briefcase size={16} className="text-brand" />
              Fundos cadastrados
              {funds && (
                <Badge variant="secondary" className="ml-1">{funds.length}</Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Clique em um fundo para ver detalhes e gerenciar os dados públicos da CVM.
            </p>
          </div>
          <Input
            placeholder="Buscar por nome, CNPJ ou ticker..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-72"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !funds || funds.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border/60 rounded-md p-6 text-center">
            Nenhum fundo cadastrado ainda. Use o formulário abaixo para criar o primeiro.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Nenhum fundo corresponde a "{q}".
          </div>
        ) : (
          <ul className="divide-y divide-border/50 -mx-2">
            {filtered.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/funds/${f.id}`}
                  className="flex items-center gap-3 px-2 py-3 rounded-md hover:bg-muted/40 transition-colors"
                  data-testid={`admin-fund-row-${f.id}`}
                >
                  <div className="h-9 w-9 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {f.nome}
                      {f.ticker && (
                        <Badge variant="outline" className="font-mono text-[10px]">{f.ticker}</Badge>
                      )}
                      {!f.cnpj && (
                        <Badge variant="secondary" className="text-[10px]">sem CNPJ</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {f.cnpj ? <span className="font-mono mr-2">{f.cnpj}</span> : null}
                      <span>{f.tese}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                    {f.nivelRisco}
                  </Badge>
                  <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <Plus size={12} /> Para adicionar um novo fundo, preencha o formulário abaixo.
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminCadastros() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"fundo" | "ativo">("fundo");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastrar fundo ou ativo"
        description="Adicione manualmente um fundo ou ativo à base. Use quando a contraparte ainda não criou conta."
      />

      <Card className="border-brand/20 bg-brand/5">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck size={18} className="text-brand flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <b className="text-foreground">Cadastro mediado · LGPD / GDPR / CCPA.</b> Ao marcar
            "Documentação verificada offline" você atesta que recebeu e revisou os documentos
            obrigatórios (CNPJ, contratos, due diligence) por canal alternativo. Isso libera o
            match sem exigir que a contraparte faça signup e suba arquivos.
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "fundo" | "ativo")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="fundo" data-testid="tab-fundo" className="gap-2">
            <Briefcase size={14} /> Fundo
          </TabsTrigger>
          <TabsTrigger value="ativo" data-testid="tab-ativo" className="gap-2">
            <Building2 size={14} /> Ativo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fundo" className="mt-4 space-y-6">
          <ExistingFundsList />
          <FundoForm
            createdBy={user?.email ?? "admin"}
            onSuccess={(name) => {
              queryClient.invalidateQueries({ queryKey: getListFundsQueryKey() });
              toast({ title: "Fundo cadastrado", description: `${name} já aparece em Curar matches.` });
              setLocation("/admin/matches");
            }}
          />
        </TabsContent>

        <TabsContent value="ativo" className="mt-4">
          <AtivoForm
            createdBy={user?.email ?? "admin"}
            onSuccess={(name) => {
              queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey() });
              toast({ title: "Ativo cadastrado", description: `${name} já aparece em Curar matches.` });
              setLocation("/admin/matches");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fundo form
// ─────────────────────────────────────────────────────────────────────────────
function FundoForm({ createdBy, onSuccess }: { createdBy: string; onSuccess: (name: string) => void }) {
  const { toast } = useToast();
  const { mutateAsync, isPending } = useCreateFund();
  const [form, setForm] = useState({
    nome: "", tese: "", descricao: "",
    ticketMin: "1000000", ticketMax: "50000000",
    nivelRisco: "medio", roiMinimo: "12", estagio: "Captação",
    segmentos: [] as string[], regioes: [] as string[],
  });
  const [contact, setContact] = useState({ name: "", email: "", phone: "", notes: "" });
  const [docsOk, setDocsOk] = useState(false);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const canSubmit = form.nome.trim() && form.tese.trim() && form.segmentos.length > 0 && form.regioes.length > 0 && docsOk;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast({ title: "Preencha todos os campos obrigatórios e confirme a documentação.", variant: "destructive" });
      return;
    }
    try {
      const fund = await mutateAsync({
        data: {
          nome: form.nome.trim(),
          tese: form.tese.trim(),
          descricao: form.descricao.trim() || undefined,
          ticketMin: Number(form.ticketMin),
          ticketMax: Number(form.ticketMax),
          segmentos: form.segmentos,
          regioes: form.regioes,
          nivelRisco: form.nivelRisco,
          roiMinimo: Number(form.roiMinimo),
          estagio: form.estagio,
        },
      });
      saveAdminCurated({
        kind: "fundo",
        entityId: fund.id,
        name: fund.nome,
        contactName: contact.name || undefined,
        contactEmail: contact.email || undefined,
        contactPhone: contact.phone || undefined,
        notes: contact.notes || undefined,
        docsVerifiedOffline: docsOk,
        createdAt: new Date().toISOString(),
        createdBy,
      });
      onSuccess(fund.nome);
    } catch (err) {
      toast({ title: "Erro ao cadastrar fundo", description: String((err as Error)?.message ?? err), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <Section title="Identificação do fundo" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome do fundo *">
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex.: Vector Real Estate I" data-testid="input-fund-name" />
              </Field>
              <Field label="Estágio">
                <Select value={form.estagio} onValueChange={(v) => setForm({ ...form, estagio: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTAGIOS_FUNDO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Tese de investimento *">
              <Textarea rows={3} value={form.tese} onChange={(e) => setForm({ ...form, tese: e.target.value })}
                placeholder="Ex.: alocamos em galpões logísticos AAA no SE, ticket R$ 5–50M, ROI 12%+." />
            </Field>
            <Field label="Descrição complementar">
              <Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </Field>
          </Section>

          <Section title="Preferências de match" icon={Lock}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Ticket mínimo (R$)">
                <Input type="number" min={0} value={form.ticketMin}
                  onChange={(e) => setForm({ ...form, ticketMin: e.target.value })} />
              </Field>
              <Field label="Ticket máximo (R$)">
                <Input type="number" min={0} value={form.ticketMax}
                  onChange={(e) => setForm({ ...form, ticketMax: e.target.value })} />
              </Field>
              <Field label="ROI mínimo (%)">
                <Input type="number" min={0} step="0.1" value={form.roiMinimo}
                  onChange={(e) => setForm({ ...form, roiMinimo: e.target.value })} />
              </Field>
            </div>
            <Field label="Nível de risco aceito">
              <Select value={form.nivelRisco} onValueChange={(v) => setForm({ ...form, nivelRisco: v })}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NIVEIS_RISCO.map((n) => <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Segmentos de interesse *">
              <ChipGrid options={SEGMENTOS} selected={form.segmentos}
                onToggle={(v) => setForm({ ...form, segmentos: toggle(form.segmentos, v) })} testidPrefix="chip-seg" />
            </Field>
            <Field label="Regiões de interesse *">
              <ChipGrid options={REGIOES} selected={form.regioes}
                onToggle={(v) => setForm({ ...form, regioes: toggle(form.regioes, v) })} testidPrefix="chip-reg" />
            </Field>
          </Section>

          <Section title="Contato (interno, não exposto à contraparte)" icon={UserPlus}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Nome do responsável">
                <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  placeholder="Maria Silva" />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="maria@fundo.com" />
              </Field>
              <Field label="Telefone">
                <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder="(11) 99999-9999" />
              </Field>
            </div>
            <Field label="Notas internas">
              <Textarea rows={2} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                placeholder="Ex.: prefere deals industriais, decide em conjunto com comitê." />
            </Field>
          </Section>

          <DocsConfirm checked={docsOk} onChange={setDocsOk} />

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
            <Button type="submit" disabled={!canSubmit || isPending}
              className="bg-brand hover:bg-brand/90 text-white gap-2" data-testid="button-save-fund">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
              Cadastrar fundo
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ativo form
// ─────────────────────────────────────────────────────────────────────────────
function AtivoForm({ createdBy, onSuccess }: { createdBy: string; onSuccess: (name: string) => void }) {
  const { toast } = useToast();
  const { mutateAsync, isPending } = useCreateAsset();
  const [form, setForm] = useState({
    nome: "", tipoAtivo: "Laje Corporativa", descricao: "", garantias: "",
    valorCaptacao: "10000000", roiPrevisto: "14", prazo: "36",
    regiao: "São Paulo", estagio: "Captação",
  });
  const [contact, setContact] = useState({ name: "", email: "", phone: "", notes: "" });
  const [docsOk, setDocsOk] = useState(false);

  const canSubmit = form.nome.trim() && form.tipoAtivo && form.regiao && docsOk;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast({ title: "Preencha todos os campos obrigatórios e confirme a documentação.", variant: "destructive" });
      return;
    }
    try {
      const asset = await mutateAsync({
        data: {
          nome: form.nome.trim(),
          tipoAtivo: form.tipoAtivo,
          descricao: form.descricao.trim() || undefined,
          garantias: form.garantias.trim() || undefined,
          valorCaptacao: Number(form.valorCaptacao),
          roiPrevisto: Number(form.roiPrevisto),
          prazo: form.prazo ? Number(form.prazo) : undefined,
          regiao: form.regiao,
          estagio: form.estagio,
        },
      });
      saveAdminCurated({
        kind: "ativo",
        entityId: asset.id,
        name: asset.nome,
        contactName: contact.name || undefined,
        contactEmail: contact.email || undefined,
        contactPhone: contact.phone || undefined,
        notes: contact.notes || undefined,
        docsVerifiedOffline: docsOk,
        createdAt: new Date().toISOString(),
        createdBy,
      });
      onSuccess(asset.nome);
    } catch (err) {
      toast({ title: "Erro ao cadastrar ativo", description: String((err as Error)?.message ?? err), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <Section title="Identificação do ativo" icon={Building2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome do projeto *">
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex.: Torre Faria Lima" data-testid="input-asset-name" />
              </Field>
              <Field label="Tipo de ativo *">
                <Select value={form.tipoAtivo} onValueChange={(v) => setForm({ ...form, tipoAtivo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_ATIVO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Descrição">
              <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: empreendimento residencial em Pinheiros, VGV R$ 80M…" />
            </Field>
            <Field label="Garantias oferecidas">
              <Input value={form.garantias} onChange={(e) => setForm({ ...form, garantias: e.target.value })}
                placeholder="Ex.: alienação fiduciária do terreno + cessão fiduciária de recebíveis" />
            </Field>
          </Section>

          <Section title="Preferências e números" icon={Lock}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Valor de captação (R$)">
                <Input type="number" min={0} value={form.valorCaptacao}
                  onChange={(e) => setForm({ ...form, valorCaptacao: e.target.value })} />
              </Field>
              <Field label="ROI previsto (%)">
                <Input type="number" min={0} step="0.1" value={form.roiPrevisto}
                  onChange={(e) => setForm({ ...form, roiPrevisto: e.target.value })} />
              </Field>
              <Field label="Prazo (meses)">
                <Input type="number" min={0} value={form.prazo}
                  onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Região *">
                <Select value={form.regiao} onValueChange={(v) => setForm({ ...form, regiao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGIOES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estágio">
                <Select value={form.estagio} onValueChange={(v) => setForm({ ...form, estagio: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTAGIOS_ATIVO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Contato (interno, não exposto à contraparte)" icon={UserPlus}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Nome do responsável">
                <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              </Field>
              <Field label="Telefone">
                <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Notas internas">
              <Textarea rows={2} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} />
            </Field>
          </Section>

          <DocsConfirm checked={docsOk} onChange={setDocsOk} />

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
            <Button type="submit" disabled={!canSubmit || isPending}
              className="bg-brand hover:bg-brand/90 text-white gap-2" data-testid="button-save-asset">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
              Cadastrar ativo
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon size={14} className="text-brand" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ChipGrid({ options, selected, onToggle, testidPrefix }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; testidPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o} type="button" onClick={() => onToggle(o)}
            data-testid={`${testidPrefix}-${o}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              active ? "bg-brand text-white border-brand" : "border-border/60 text-muted-foreground hover:border-brand/40"
            }`}
          >{o}</button>
        );
      })}
    </div>
  );
}

function DocsConfirm({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
      checked ? "border-emerald-500/50 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border accent-[#d6972b] cursor-pointer flex-shrink-0"
        data-testid="checkbox-docs-verified"
      />
      <div className="text-xs leading-relaxed flex-1">
        <div className="flex items-center gap-1.5 font-semibold text-foreground mb-0.5">
          <FileCheck2 size={13} className="text-brand" />
          Documentação verificada offline *
        </div>
        <span className="text-muted-foreground">
          Confirmo que recebi e revisei pessoalmente todos os documentos obrigatórios desta
          contraparte (CNPJ, contratos, due diligence) e respondo pela veracidade. Marcando este
          campo, libero a entidade para ser pareada em <i>Curar matches</i>.
        </span>
      </div>
    </label>
  );
}
