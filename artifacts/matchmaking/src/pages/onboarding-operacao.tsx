import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateAsset } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Building, MapPin, DollarSign, FileCheck, Calendar, Sparkles, Loader2 } from "lucide-react";

type StepNum = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const TIPOS = ["Residencial", "Comercial", "Galpão Logístico", "Hotel", "Loteamento", "Multiuso"];
const ESTAGIOS = ["Greenfield", "Em construção", "Pronto", "Operacional"];
const TERRENO = ["Próprio quitado", "Próprio com gravame", "Permuta", "Em aquisição"];
const LIC = ["Aprovado", "Em análise", "Pré-viabilidade", "Pendente"];
const FUNDING = ["Equity", "Dívida", "Misto"];

const STEPS: { id: StepNum; title: string; subtitle: string; icon: any }[] = [
  { id: 1, title: "A operação", subtitle: "Conta pra gente o básico", icon: Building },
  { id: 2, title: "Localização", subtitle: "Onde fica o empreendimento", icon: MapPin },
  { id: 3, title: "VGV e captação", subtitle: "Quanto vale e quanto precisa", icon: DollarSign },
  { id: 4, title: "Terreno e licença", subtitle: "Status estrutural", icon: FileCheck },
  { id: 5, title: "Cronograma", subtitle: "Tempo da obra", icon: Calendar },
  { id: 6, title: "Governança SPE", subtitle: "Como tá estruturada", icon: Building },
  { id: 7, title: "Revisão", subtitle: "Confere e envia", icon: Check },
];

export default function OnboardingOperacao() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createAsset = useCreateAsset();
  const [step, setStep] = useState<StepNum>(1);

  const [form, setForm] = useState({
    nome: "",
    tipoAtivo: TIPOS[0]!,
    descricao: "",
    incorporadora: "",
    regiao: "",
    cnpjSpe: "",
    valorCaptacao: "",
    vgv: "",
    roiPrevisto: "15",
    estagio: ESTAGIOS[0]!,
    numUnidades: "",
    percentualVendido: "",
    equityAportado: "",
    statusTerreno: TERRENO[0]!,
    statusLicenciamento: LIC[0]!,
    cronogramaMeses: "",
    mesesDecorridos: "0",
    patrimonioAfetacao: false,
    tipoFunding: FUNDING[0]!,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canAdvance = (s: StepNum): boolean => {
    if (s === 1) return form.nome.length >= 3 && !!form.tipoAtivo;
    if (s === 2) return form.regiao.length >= 2;
    if (s === 3) return Number(form.valorCaptacao) > 0;
    return true;
  };

  const submit = async () => {
    try {
      const data: any = {
        nome: form.nome,
        tipoAtivo: form.tipoAtivo,
        valorCaptacao: Number(form.valorCaptacao),
        roiPrevisto: Number(form.roiPrevisto) || 0,
        regiao: form.regiao,
        estagio: form.estagio,
        descricao: form.descricao || undefined,
        incorporadora: form.incorporadora || undefined,
        cnpjSpe: form.cnpjSpe || undefined,
        vgv: form.vgv ? Number(form.vgv) : undefined,
        percentualVendido: form.percentualVendido ? Number(form.percentualVendido) : undefined,
        equityAportado: form.equityAportado ? Number(form.equityAportado) : undefined,
        patrimonioAfetacao: form.patrimonioAfetacao,
        statusTerreno: form.statusTerreno,
        statusLicenciamento: form.statusLicenciamento,
        numUnidades: form.numUnidades ? Number(form.numUnidades) : undefined,
        cronogramaMeses: form.cronogramaMeses ? Number(form.cronogramaMeses) : undefined,
        mesesDecorridos: form.mesesDecorridos ? Number(form.mesesDecorridos) : undefined,
        tipoFunding: form.tipoFunding,
      };
      await createAsset.mutateAsync({ data });
      toast({ title: "Operação cadastrada", description: "Você já pode acompanhar pela sua área." });
      setLocation("/area");
    } catch (e) {
      toast({ title: "Erro ao cadastrar", description: String(e), variant: "destructive" });
    }
  };

  const current = STEPS[step - 1]!;
  const Icon = current.icon;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
          Onboarding · Etapa {step}/7
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Estruture sua operação pra captar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sete etapas curtas. No final você revisa tudo antes de confirmar.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                  done ? "bg-brand text-white border-brand" :
                  active ? "border-brand text-brand bg-brand/10" :
                  "border-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 ${step > s.id ? "bg-brand" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 text-brand" /> {current.title}
          </CardTitle>
          <CardDescription>{current.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {step === 1 && (
                <>
                  <div>
                    <Label>Como você chama esse empreendimento?</Label>
                    <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Residencial Vila Nova" data-testid="input-nome" />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <select
                      value={form.tipoAtivo}
                      onChange={(e) => set("tipoAtivo", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {TIPOS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Conta em poucas linhas o que é a operação</Label>
                    <Textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} rows={3} placeholder="Ex: 80 unidades de 2 e 3 dormitórios, foco em classe média alta em bairro consolidado..." />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <Label>Cidade / Estado</Label>
                    <Input value={form.regiao} onChange={(e) => set("regiao", e.target.value)} placeholder="Ex: Goiânia/GO" />
                  </div>
                  <div>
                    <Label>Sua empresa (incorporadora)</Label>
                    <Input value={form.incorporadora} onChange={(e) => set("incorporadora", e.target.value)} placeholder="Razão social ou nome fantasia" />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>VGV total (R$)</Label>
                      <Input type="number" value={form.vgv} onChange={(e) => set("vgv", e.target.value)} placeholder="80000000" />
                    </div>
                    <div>
                      <Label>Quanto precisa captar (R$)</Label>
                      <Input type="number" value={form.valorCaptacao} onChange={(e) => set("valorCaptacao", e.target.value)} placeholder="20000000" />
                    </div>
                    <div>
                      <Label>ROI estimado (%)</Label>
                      <Input type="number" value={form.roiPrevisto} onChange={(e) => set("roiPrevisto", e.target.value)} placeholder="15" />
                    </div>
                    <div>
                      <Label>Tipo de funding</Label>
                      <select
                        value={form.tipoFunding}
                        onChange={(e) => set("tipoFunding", e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        {FUNDING.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se ainda não fechou o ROI exato, deixa a estimativa. Dá pra ajustar depois.
                  </p>
                </>
              )}

              {step === 4 && (
                <>
                  <div>
                    <Label>Status do terreno</Label>
                    <select
                      value={form.statusTerreno}
                      onChange={(e) => set("statusTerreno", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {TERRENO.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Status do licenciamento</Label>
                    <select
                      value={form.statusLicenciamento}
                      onChange={(e) => set("statusLicenciamento", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {LIC.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Estágio</Label>
                    <select
                      value={form.estagio}
                      onChange={(e) => set("estagio", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {ESTAGIOS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cronograma total (meses)</Label>
                      <Input type="number" value={form.cronogramaMeses} onChange={(e) => set("cronogramaMeses", e.target.value)} placeholder="36" />
                    </div>
                    <div>
                      <Label>Já decorreram (meses)</Label>
                      <Input type="number" value={form.mesesDecorridos} onChange={(e) => set("mesesDecorridos", e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Nº de unidades</Label>
                      <Input type="number" value={form.numUnidades} onChange={(e) => set("numUnidades", e.target.value)} placeholder="80" />
                    </div>
                    <div>
                      <Label>% vendido (VSO)</Label>
                      <Input type="number" value={form.percentualVendido} onChange={(e) => set("percentualVendido", e.target.value)} placeholder="0" />
                    </div>
                  </div>
                </>
              )}

              {step === 6 && (
                <>
                  <div>
                    <Label>CNPJ da SPE (se já constituída)</Label>
                    <Input value={form.cnpjSpe} onChange={(e) => set("cnpjSpe", e.target.value)} placeholder="00.000.000/0000-00" />
                  </div>
                  <div>
                    <Label>Equity já aportado (R$)</Label>
                    <Input type="number" value={form.equityAportado} onChange={(e) => set("equityAportado", e.target.value)} placeholder="5000000" />
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer p-3 rounded-md border border-border bg-muted/30">
                    <input
                      type="checkbox"
                      checked={form.patrimonioAfetacao}
                      onChange={(e) => set("patrimonioAfetacao", e.target.checked)}
                      className="mt-0.5"
                    />
                    <div className="text-sm">
                      <div className="font-medium">Patrimônio de afetação constituído</div>
                      <div className="text-xs text-muted-foreground">
                        Separa juridicamente o patrimônio da SPE do restante da empresa — fundo institucional dá peso alto pra isso.
                      </div>
                    </div>
                  </label>
                </>
              )}

              {step === 7 && (
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">Tudo certo? Esses dados vão pro seu perfil de operação e ativam o underwriting + matching automaticamente.</p>
                  <div className="rounded-md border border-border bg-muted/20 p-4 space-y-1.5 text-xs">
                    <Row k="Nome" v={form.nome} />
                    <Row k="Tipo" v={`${form.tipoAtivo} (${form.estagio})`} />
                    <Row k="Local" v={form.regiao} />
                    <Row k="Incorporadora" v={form.incorporadora || "—"} />
                    <Row k="VGV" v={form.vgv ? `R$ ${Number(form.vgv).toLocaleString("pt-BR")}` : "—"} />
                    <Row k="Captação" v={`R$ ${Number(form.valorCaptacao || 0).toLocaleString("pt-BR")}`} />
                    <Row k="Terreno" v={form.statusTerreno} />
                    <Row k="Licença" v={form.statusLicenciamento} />
                    <Row k="Cronograma" v={`${form.mesesDecorridos || 0}/${form.cronogramaMeses || "?"} meses`} />
                    <Row k="Pat. afetação" v={form.patrimonioAfetacao ? "Sim ✓" : "Não constituído"} />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as StepNum) : s))}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        {step < 7 ? (
          <Button
            onClick={() => setStep((s) => (s + 1) as StepNum)}
            disabled={!canAdvance(step)}
            className="bg-brand text-white hover:bg-brand/90"
          >
            Avançar <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={createAsset.isPending} className="bg-brand text-white hover:bg-brand/90">
            {createAsset.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Cadastrar operação
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
