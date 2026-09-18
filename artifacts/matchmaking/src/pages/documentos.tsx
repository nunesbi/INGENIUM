import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth, defaultDocsFor, docsProgress, type CompanyDoc } from "@/lib/auth";
import { useLocation, Redirect } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { LegalFooter } from "@/components/legal-footer";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@workspace/object-storage-web";
import {
  FileText, Upload, Check, AlertCircle, ArrowRight, Sparkles, Trash2, Lock, ShieldCheck,
} from "lucide-react";

const MAX_BYTES = 20 * 1024 * 1024; // 20MB
const ACCEPTED = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg";

interface ServerDoc {
  id: number;
  docKey: string;
  docName: string;
  required: boolean;
  fileName: string;
  fileSize: number;
  contentType: string | null;
  objectPath: string;
  createdAt: string;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

type DocRowState = CompanyDoc & { dbId?: number };

export default function Documentos() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const isOnboarding = location.includes("onboarding=1");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRowState[]>([]);
  const [loaded, setLoaded] = useState(false);

  const slots = useMemo<CompanyDoc[]>(
    () => (user ? defaultDocsFor(user.role) : []),
    [user],
  );

  const hydrate = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`/api/documents/mine?email=${encodeURIComponent(user.email)}`);
      if (!r.ok) throw new Error("Failed");
      const remote: ServerDoc[] = await r.json();
      const byKey = new Map(remote.map((d) => [d.docKey, d]));
      const merged: DocRowState[] = slots.map((slot) => {
        const s = byKey.get(slot.id);
        if (!s) return { ...slot };
        return {
          ...slot,
          status: "uploaded",
          uploadedAt: s.createdAt,
          fileName: s.fileName,
          fileSize: s.fileSize,
          dbId: s.id,
        };
      });
      setDocs(merged);
    } catch (e) {
      setDocs(slots);
    } finally {
      setLoaded(true);
    }
  }, [user, slots]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const { uploadFile } = useUpload();

  if (!user) return null;
  if (user.role === "admin") return <Redirect to="/admin/documentos" />;

  const progress = docsProgress(docs);

  const handleFile = async (doc: DocRowState, file: File) => {
    if (file.size > MAX_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Limite de 20 MB.", variant: "destructive" });
      return;
    }
    setUploadingId(doc.id);
    try {
      const upload = await uploadFile(file);
      if (!upload) throw new Error("Upload falhou");
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail: user.email,
          ownerRole: user.role,
          ownerName: user.name,
          ownerCompany: user.company,
          docKey: doc.id,
          docName: doc.name,
          required: doc.required,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || null,
          objectPath: upload.objectPath,
        }),
      });
      if (!res.ok) throw new Error(`Registro falhou: ${res.status}`);
      const saved: ServerDoc = await res.json();
      setDocs((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: "uploaded",
                uploadedAt: saved.createdAt,
                fileName: saved.fileName,
                fileSize: saved.fileSize,
                dbId: saved.id,
              }
            : d,
        ),
      );
      toast({ title: `${doc.name} enviado`, description: file.name });
    } catch (e) {
      toast({
        title: "Falha no envio",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemove = async (doc: DocRowState) => {
    if (!doc.dbId) return;
    try {
      const r = await fetch(`/api/documents/${doc.dbId}?email=${encodeURIComponent(user.email)}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Falha ao remover");
      setDocs((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, status: "missing", uploadedAt: undefined, fileName: undefined, fileSize: undefined, dbId: undefined } : d,
        ),
      );
      toast({ title: `${doc.name} removido` });
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" });
    }
  };

  const required = docs.filter((d) => d.required);
  const optional = docs.filter((d) => !d.required);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOnboarding ? "Quase lá — envie seus documentos" : "Documentos da empresa"}
        description={
          user.role === "fundo"
            ? "Documentos do fundo são compartilhados apenas com ativos que você autorizar para DD."
            : "Documentos do projeto ficam no data room, visíveis somente aos fundos que você autorizar."
        }
        actions={
          isOnboarding && (
            <Button variant="outline" onClick={() => setLocation("/area")}>
              Pular por agora <ArrowRight size={14} className="ml-1" />
            </Button>
          )
        }
      />

      {/* LGPD notice */}
      <Card className="border-brand/20 bg-brand/5">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck size={18} className="text-brand flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <b className="text-foreground">Tratamento de dados conforme LGPD / GDPR / CCPA.</b> Arquivos são criptografados
            em trânsito (TLS 1.3) e em repouso (AES-256). Você pode remover qualquer documento ou excluir sua conta
            a qualquer momento em <a className="text-brand hover:underline" href="/configuracoes">Configurações</a>.
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Completude do cadastro</div>
              <div className="text-2xl font-bold tracking-tight">{progress.pct}%</div>
            </div>
            <Badge
              variant="outline"
              className={
                progress.missingRequired === 0
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "bg-brand/10 text-brand border-brand/30"
              }
            >
              {progress.missingRequired === 0 ? "Pronto" : `${progress.missingRequired} obrigatório(s) pendente(s)`}
            </Badge>
          </div>
          <Progress value={progress.pct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-3">
            {progress.uploaded} de {progress.total} documentos enviados.
            {!loaded && " · Carregando…"}
          </p>
        </CardContent>
      </Card>

      {/* Required */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Documentos obrigatórios</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Necessários para liberar matches qualificados.</p>
            </div>
            <Badge variant="outline" className="text-xs">{required.filter(d => d.status === "uploaded").length}/{required.length}</Badge>
          </div>
          <div className="divide-y divide-border/40">
            {required.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                uploading={uploadingId === d.id}
                onUpload={(f) => handleFile(d, f)}
                onRemove={() => handleRemove(d)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optional */}
      {optional.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Documentos complementares</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Opcionais — fortalecem sua compatibilidade.</p>
              </div>
              <Badge variant="outline" className="text-xs">{optional.filter(d => d.status === "uploaded").length}/{optional.length}</Badge>
            </div>
            <div className="divide-y divide-border/40">
              {optional.map((d) => (
                <DocRow
                  key={d.id}
                  doc={d}
                  uploading={uploadingId === d.id}
                  onUpload={(f) => handleFile(d, f)}
                  onRemove={() => handleRemove(d)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {progress.missingRequired === 0 && progress.total > 0 && (
        <Card className="border-brand/30 bg-brand/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center text-brand">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Tudo pronto!</div>
              <p className="text-xs text-muted-foreground">A engine já pode gerar matches qualificados para você.</p>
            </div>
            <Button asChild className="bg-brand hover:bg-brand/90 text-white">
              <a href="/area">Ir para minha área</a>
            </Button>
          </CardContent>
        </Card>
      )}

      <LegalFooter />
    </div>
  );
}

function DocRow({ doc, uploading, onUpload, onRemove }: {
  doc: DocRowState; uploading: boolean; onUpload: (f: File) => void; onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploaded = doc.status === "uploaded";

  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          uploaded ? "bg-brand/10 text-brand" : doc.required ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        }`}>
          {uploaded ? <Check size={16} /> : doc.required ? <AlertCircle size={16} /> : <FileText size={16} />}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{doc.name}</div>
          {uploaded && doc.fileName ? (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
              <Lock size={10} className="text-brand" />
              <span className="truncate">{doc.fileName}</span>
              {doc.fileSize !== undefined && <span>· {formatBytes(doc.fileSize)}</span>}
              <span>· {new Date(doc.uploadedAt!).toLocaleDateString("pt-BR")}</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              {doc.required ? "Obrigatório · pendente" : "Opcional"}
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
        data-testid={`file-${doc.id}`}
      />

      {uploaded ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="text-muted-foreground hover:text-brand gap-2" data-testid={`replace-${doc.id}`}>
            <Upload size={14} />
            <span className="hidden sm:inline">Trocar</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove}
            className="text-muted-foreground hover:text-destructive gap-2" data-testid={`remove-${doc.id}`}>
            <Trash2 size={14} />
            <span className="hidden sm:inline">Remover</span>
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="gap-2 border-brand/40 text-brand hover:bg-brand/10 hover:text-brand flex-shrink-0"
          data-testid={`upload-${doc.id}`}>
          <Upload size={14} /> {uploading ? "Enviando..." : "Selecionar arquivo"}
        </Button>
      )}
    </div>
  );
}
