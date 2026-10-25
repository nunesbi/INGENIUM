import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FundInput, FundPatch, Fund } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const fundSchema = z.object({
  nome: z.string().min(1, "Name is required"),
  tese: z.string().min(1, "Thesis is required"),
  ticketMin: z.coerce.number().min(0, "Min ticket must be positive"),
  ticketMax: z.coerce.number().min(0, "Max ticket must be positive"),
  segmentos: z.string().transform(val => val.split(",").map(v => v.trim()).filter(Boolean)),
  regioes: z.string().transform(val => val.split(",").map(v => v.trim()).filter(Boolean)),
  nivelRisco: z.string().min(1, "Risk level is required"),
  roiMinimo: z.coerce.number().min(0, "Min ROI must be positive"),
  descricao: z.string().optional(),
  estagio: z.string().min(1, "Stage is required"),
  cnpj: z.string().optional(),
  ticker: z.string().optional(),
  relatorioPdfUrl: z.string().optional(),
});

type FundFormValues = z.input<typeof fundSchema>;

interface FundFormProps {
  initialData?: Fund;
  onSubmit: (data: FundInput) => void;
  isLoading?: boolean;
}

export function FundForm({ initialData, onSubmit, isLoading }: FundFormProps) {
  const form = useForm<FundFormValues>({
    resolver: zodResolver(fundSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      tese: initialData?.tese || "",
      ticketMin: initialData?.ticketMin || 0,
      ticketMax: initialData?.ticketMax || 0,
      segmentos: initialData?.segmentos?.join(", ") || "",
      regioes: initialData?.regioes?.join(", ") || "",
      nivelRisco: initialData?.nivelRisco || "medium",
      roiMinimo: initialData?.roiMinimo || 0,
      descricao: initialData?.descricao || "",
      estagio: initialData?.estagio || "Growth",
      cnpj: initialData?.cnpj || "",
      ticker: initialData?.ticker || "",
      relatorioPdfUrl: initialData?.relatorioPdfUrl || "",
    },
  });

  const handleSubmit = (values: FundFormValues) => {
    onSubmit(values as any as FundInput);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fund Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Capital" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="tese"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investment Thesis</FormLabel>
              <FormControl>
                <Input placeholder="Core plus residential" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ticketMin"
            render={({ field }) => (
               <FormItem>
                 <FormLabel>Min Ticket (BRL)</FormLabel>
                 <FormControl>
                   <Input type="number" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ticketMax"
            render={({ field }) => (
               <FormItem>
                 <FormLabel>Max Ticket (BRL)</FormLabel>
                 <FormControl>
                   <Input type="number" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="segmentos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segments (comma separated)</FormLabel>
                <FormControl>
                  <Input placeholder="Residential, Logistics" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="regioes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regions (comma separated)</FormLabel>
                <FormControl>
                  <Input placeholder="SP, RJ, South" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nivelRisco"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Risk Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estagio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stage</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Early">Early</SelectItem>
                    <SelectItem value="Growth">Growth</SelectItem>
                    <SelectItem value="Mature">Mature</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="roiMinimo"
          render={({ field }) => (
             <FormItem>
               <FormLabel>Min Target ROI (%)</FormLabel>
               <FormControl>
                 <Input type="number" step="0.1" {...field} />
               </FormControl>
               <FormMessage />
             </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Fund details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ (FII registrado na CVM)</FormLabel>
                <FormControl>
                  <Input placeholder="00.000.000/0000-00" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Necessário para sincronizar dados públicos da CVM automaticamente.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ticker"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticker B3 (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="XPML11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="relatorioPdfUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Relatório Gerencial (PDF)</FormLabel>
              <FormControl>
                <Input placeholder="https://...relatorio-gerencial.pdf" {...field} />
              </FormControl>
              <FormDescription className="text-xs">
                URL pública do PDF do relatório gerencial mais recente. Salva uma vez aqui — a extração de perfil via IA reaproveita esta URL.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Fund"}
        </Button>
      </form>
    </Form>
  );
}
