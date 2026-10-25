import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AssetInput, Asset } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Building2, Banknote, FileCheck2 } from "lucide-react";

// Form values use string for numeric inputs (HTML <input> always returns string).
// We coerce + strip empty values at submit time.
const assetSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipoAtivo: z.string().min(1, "Tipo de ativo é obrigatório"),
  valorCaptacao: z.coerce.number().min(1, "Valor de captação deve ser positivo"),
  roiPrevisto: z.coerce.number().min(0, "ROI deve ser positivo"),
  regiao: z.string().min(1, "Região é obrigatória"),
  estagio: z.string().min(1, "Estágio é obrigatório"),
  descricao: z.string().optional(),
  garantias: z.string().optional(),
  prazo: z.string().optional(),
  // SPE / estrutura — all string in the form, coerced at submit
  cnpjSpe: z.string().optional(),
  incorporadora: z.string().optional(),
  vgv: z.string().optional(),
  percentualVendido: z.string().optional(),
  equityAportado: z.string().optional(),
  patrimonioAfetacao: z.boolean().optional(),
  statusTerreno: z.string().optional(),
  statusLicenciamento: z.string().optional(),
  numUnidades: z.string().optional(),
  passivosTotais: z.string().optional(),
  recebiveisTotais: z.string().optional(),
  caixaAtual: z.string().optional(),
  cronogramaMeses: z.string().optional(),
  mesesDecorridos: z.string().optional(),
  tipoFunding: z.string().optional(),
});

type AssetFormValues = z.input<typeof assetSchema>;

const NUM_FIELDS = ["prazo","vgv","percentualVendido","equityAportado","numUnidades","passivosTotais","recebiveisTotais","caixaAtual","cronogramaMeses","mesesDecorridos"] as const;
const STR_FIELDS = ["descricao","garantias","cnpjSpe","incorporadora","statusTerreno","statusLicenciamento","tipoFunding"] as const;

function cleanFormValues(values: AssetFormValues): AssetInput {
  const out: Record<string, unknown> = {
    nome: values.nome,
    tipoAtivo: values.tipoAtivo,
    valorCaptacao: Number(values.valorCaptacao),
    roiPrevisto: Number(values.roiPrevisto),
    regiao: values.regiao,
    estagio: values.estagio,
  };
  for (const f of STR_FIELDS) {
    const v = values[f];
    if (typeof v === "string" && v.trim() !== "") out[f] = v;
  }
  for (const f of NUM_FIELDS) {
    const v = values[f];
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) out[f] = n;
    } else if (typeof v === "number") {
      out[f] = v;
    }
  }
  if (typeof values.patrimonioAfetacao === "boolean") out.patrimonioAfetacao = values.patrimonioAfetacao;
  return out as unknown as AssetInput;
}

interface AssetFormProps {
  initialData?: Asset;
  onSubmit: (data: AssetInput) => void;
  isLoading?: boolean;
}

export function AssetForm({ initialData, onSubmit, isLoading }: AssetFormProps) {
  const toStr = (v: number | null | undefined) =>
    v === null || v === undefined ? "" : String(v);
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema) as any,
    defaultValues: {
      nome: initialData?.nome || "",
      tipoAtivo: initialData?.tipoAtivo || "",
      valorCaptacao: (initialData?.valorCaptacao ?? 0) as any,
      roiPrevisto: (initialData?.roiPrevisto ?? 0) as any,
      regiao: initialData?.regiao || "",
      estagio: initialData?.estagio || "Early",
      descricao: initialData?.descricao || "",
      garantias: initialData?.garantias || "",
      prazo: toStr(initialData?.prazo),
      cnpjSpe: initialData?.cnpjSpe ?? "",
      incorporadora: initialData?.incorporadora ?? "",
      vgv: toStr(initialData?.vgv),
      percentualVendido: toStr(initialData?.percentualVendido),
      equityAportado: toStr(initialData?.equityAportado),
      patrimonioAfetacao: initialData?.patrimonioAfetacao ?? false,
      statusTerreno: initialData?.statusTerreno ?? "",
      statusLicenciamento: initialData?.statusLicenciamento ?? "",
      numUnidades: toStr(initialData?.numUnidades),
      passivosTotais: toStr(initialData?.passivosTotais),
      recebiveisTotais: toStr(initialData?.recebiveisTotais),
      caixaAtual: toStr(initialData?.caixaAtual),
      cronogramaMeses: toStr(initialData?.cronogramaMeses),
      mesesDecorridos: toStr(initialData?.mesesDecorridos),
      tipoFunding: initialData?.tipoFunding ?? "",
    },
  });

  const handleSubmit = (values: AssetFormValues) => {
    onSubmit(cleanFormValues(values));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Projeto</FormLabel>
              <FormControl><Input placeholder="Projeto X" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="tipoAtivo" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Ativo</FormLabel>
              <FormControl><Input placeholder="Residencial, CRI, Logístico..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="valorCaptacao" render={({ field }) => (
            <FormItem>
              <FormLabel>Valor de Captação (R$)</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="roiPrevisto" render={({ field }) => (
            <FormItem>
              <FormLabel>ROI Previsto (%)</FormLabel>
              <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="prazo" render={({ field }) => (
            <FormItem>
              <FormLabel>Prazo (meses)</FormLabel>
              <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="regiao" render={({ field }) => (
            <FormItem>
              <FormLabel>Região</FormLabel>
              <FormControl><Input placeholder="SP, RJ..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="estagio" render={({ field }) => (
            <FormItem>
              <FormLabel>Estágio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Early">Early</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="Mature">Mature</SelectItem>
                  <SelectItem value="lançamento">Lançamento</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="operacional">Operacional</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <FormField control={form.control} name="garantias" render={({ field }) => (
          <FormItem>
            <FormLabel>Garantias / Colateral</FormLabel>
            <FormControl><Input placeholder="Alienação fiduciária, cessão de recebíveis..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>

        <FormField control={form.control} name="descricao" render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição</FormLabel>
            <FormControl><Textarea placeholder="Detalhes da operação..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>

        {/* ─── Estrutura institucional (SPE) — opcional mas eleva o readiness score ─── */}
        <Accordion type="multiple" defaultValue={initialData?.cnpjSpe ? ["spe", "fin", "comm"] : []} className="border rounded-md">
          <AccordionItem value="spe" className="border-b">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Estrutura da SPE
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="cnpjSpe" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">CNPJ da SPE</FormLabel>
                    <FormControl><Input placeholder="00.000.000/0001-00" {...field} /></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="incorporadora" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Incorporadora</FormLabel>
                    <FormControl><Input placeholder="Razão social" {...field} /></FormControl>
                  </FormItem>
                )}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="statusTerreno" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Status do Terreno</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="comprado_pago">Comprado e pago</SelectItem>
                        <SelectItem value="comprado_a_pagar">Comprado a pagar</SelectItem>
                        <SelectItem value="permuta">Permuta</SelectItem>
                        <SelectItem value="negociacao">Em negociação</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="statusLicenciamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Licenciamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_aprovacao">Em aprovação</SelectItem>
                        <SelectItem value="aprovado">Projeto aprovado</SelectItem>
                        <SelectItem value="alvara_emitido">Alvará emitido</SelectItem>
                        <SelectItem value="habite_se">Habite-se</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="patrimonioAfetacao" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-xs">Patrimônio de afetação</FormLabel>
                    <FormDescription className="text-xs">Lei 10.931/04 — segrega ativos e passivos da SPE.</FormDescription>
                  </div>
                  <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}/>
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="numUnidades" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Nº de unidades</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="cronogramaMeses" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Cronograma (meses)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="mesesDecorridos" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Meses decorridos</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )}/>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fin" className="border-b">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                Financeiro
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="vgv" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">VGV (R$)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="equityAportado" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Equity aportado (R$)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )}/>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="caixaAtual" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Caixa atual (R$)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="passivosTotais" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Passivos (R$)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="recebiveisTotais" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Recebíveis (R$)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="tipoFunding" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Tipo de funding pretendido</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="divida">Dívida</SelectItem>
                      <SelectItem value="mezanino">Mezanino</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}/>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="comm" className="border-b-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                Comercial
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <FormField control={form.control} name="percentualVendido" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Percentual já vendido (%)</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )}/>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
        </Button>
      </form>
    </Form>
  );
}
