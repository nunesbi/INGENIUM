import { useState } from "react";
import { Link } from "wouter";
import {
  useListAssets,
  useCreateAsset,
  getListAssetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AssetForm } from "@/components/asset-form";
import {
  Search,
  Plus,
  MapPin,
  ArrowRight,
  Building,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";

export default function Assets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const { user } = useAuth();

  const { data: assets, isLoading } = useListAssets();
  const createAsset = useCreateAsset();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /*
   * Fundos podem explorar os ativos cadastrados na plataforma.
   * A manifestação de interesse e os matches continuam sendo
   * tratados separadamente.
   */
  const isFundo = user?.role === "fundo";

  const visibleAssets = assets;

  const filteredAssets = visibleAssets?.filter(
    (a) =>
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.tipoAtivo.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreate = (data: any) => {
    createAsset.mutate(
      { data },
      {
        onSuccess: async (asset: any) => {
          try {
            /*
             * Depois de criar o ativo, executa automaticamente
             * o motor de matching contra os fundos cadastrados.
             */
            const response = await fetch("/api/matches/run", {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ativoId: asset.id,
                generateAI: true,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();

              throw new Error(
                `Matching falhou (${response.status}): ${errorText}`,
              );
            }

            await response.json();

            queryClient.invalidateQueries({
              queryKey: getListAssetsQueryKey(),
            });

            setSheetOpen(false);

            toast({
              title: "Ativo criado e matching executado",
              description:
                "Os fundos compatíveis foram calculados com sucesso.",
            });
          } catch (err) {
            queryClient.invalidateQueries({
              queryKey: getListAssetsQueryKey(),
            });

            setSheetOpen(false);

            toast({
              title: "Ativo criado, mas o matching falhou",
              description: String(err),
              variant: "destructive",
            });
          }
        },

        onError: (err) => {
          toast({
            title: "Erro ao criar ativo",
            description: String(err),
            variant: "destructive",
          });
        },
      },
    );
  };

  const newAssetButton = (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button
          className="shrink-0 gap-2 bg-brand hover:bg-brand/90 text-white"
          data-testid="button-new-asset"
        >
          <Plus size={16} />
          Novo ativo
        </Button>
      </SheetTrigger>

      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Novo ativo</SheetTitle>

          <SheetDescription>
            Adicione um projeto em busca de capital à engine de matchmaking.
          </SheetDescription>
        </SheetHeader>

        <AssetForm
          onSubmit={handleCreate}
          isLoading={createAsset.isPending}
        />
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={isFundo ? "Explorar operações" : "Ativos"}
        description={
          isFundo
            ? "Explore operações disponíveis para investimento e conheça seus principais indicadores."
            : "Gerencie projetos e oportunidades de captação."
        }
        actions={isFundo ? undefined : newAssetButton}
      />

      <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center gap-3 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

            <Input
              placeholder="Buscar por nome ou tipo..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-assets"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10 border-border/60">
                <TableHead>Projeto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Captação</TableHead>
                <TableHead>ROI previsto</TableHead>
                <TableHead>Localização/Estágio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array(5)
                  .fill(null)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : filteredAssets?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building className="h-8 w-8 text-muted-foreground/50" />

                      <p>
                        {isFundo
                          ? "Nenhuma operação disponível no momento."
                          : "Nenhum ativo encontrado."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets?.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className="group hover:bg-muted/30"
                  >
                    <TableCell className="font-medium text-foreground">
                      {asset.nome}
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded">
                        {asset.tipoAtivo}
                      </span>
                    </TableCell>

                    <TableCell className="font-mono text-sm font-semibold tracking-tight">
                      {formatCurrency(asset.valorCaptacao)}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-[#d6972b]/10 text-brand border-[#d6972b]/30"
                      >
                        {formatPercent(asset.roiPrevisto)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <MapPin size={12} />
                          {asset.regiao}
                        </span>

                        <span className="text-xs font-medium">
                          {asset.estagio}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-brand hover:text-brand hover:bg-[#d6972b]/10"
                      >
                        <Link href={`/assets/${asset.id}`}>
                          Detalhes
                          <ArrowRight size={14} className="ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}