import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, Send, X, Sparkles, Building2, Briefcase, TrendingUp, ChevronRight, FileText, Loader2 } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

interface TopMatch {
  id: number;
  score: number;
  fundName: string;
  assetName: string;
  motivos: string[];
  pontosFortes?: string[];
  pontosFracos?: string[];
}

interface ActionResult {
  type: string;
  record?: { id: number; nome: string; type: string };
  topMatches?: TopMatch[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  fileName?: string;
  fileType?: string;
  action?: ActionResult;
  loading?: boolean;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: `Olá 👋 Sou o **Copilot Ingenium** — seu parceiro pra deixar a operação pronta pra captar.

Trabalho com você de dois jeitos:

**📄 Manda o que você tem** — memorial, viabilidade, planilha de SPE, qualquer PDF — e eu organizo os dados num formato que fundo institucional reconhece.

**💬 Me conta em texto** — "tenho um residencial de 80 unidades em Goiânia, 30% vendido, SPE constituída" — e a gente vai estruturando juntos.

Sem jargão complicado. Se algo soar estranho, é só perguntar. Por onde a gente começa?`,
  action: undefined,
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `R$ ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
    : score >= 45 ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
    : "text-red-400 bg-red-400/10 border-red-400/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}

function ActionCard({ action }: { action: ActionResult }) {
  const isAsset = action.type === "create_asset";
  const label = isAsset ? "Ativo cadastrado" : "Fundo cadastrado";
  const href = isAsset
    ? `/assets/${action.record?.id}`
    : `/funds/${action.record?.id}`;

  return (
    <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-brand/5 border-b border-border">
        {isAsset ? <Building2 size={14} className="text-brand" /> : <Briefcase size={14} className="text-brand" />}
        <span className="text-xs font-semibold text-brand uppercase tracking-wide">{label}</span>
        <a
          href={href}
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver perfil <ChevronRight size={12} />
        </a>
      </div>

      <div className="px-4 py-3">
        <p className="font-semibold text-sm text-foreground">{action.record?.nome}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{action.record?.type}</p>
      </div>

      {action.topMatches && action.topMatches.length > 0 && (
        <div className="border-t border-border">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/20">
            <TrendingUp size={13} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Top {Math.min(3, action.topMatches.length)} matches encontrados
            </span>
          </div>
          <div className="divide-y divide-border">
            {action.topMatches.slice(0, 3).map((m, i) => {
              const forte = m.pontosFortes?.[0] ?? m.motivos[0];
              const fraco = m.pontosFracos?.[0];
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={m.score} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isAsset ? m.fundName : m.assetName}
                      </p>
                    </div>
                    {m.id > 0 && (
                      <a
                        href={`/matches/${m.id}`}
                        className="text-xs text-brand hover:underline whitespace-nowrap"
                      >
                        Ver match
                      </a>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 pl-1">
                    {forte && (
                      <p className="text-xs text-emerald-500/90 leading-snug flex gap-1.5">
                        <span className="text-emerald-500">✓</span>
                        <span className="line-clamp-2">{forte}</span>
                      </p>
                    )}
                    {fraco && (
                      <p className="text-xs text-red-400/80 leading-snug flex gap-1.5">
                        <span className="text-red-400">✗</span>
                        <span className="line-clamp-2">{fraco}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          {msg.fileName && (
            <div className="flex items-center gap-2 mb-1.5 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
              <FileText size={14} />
              <span className="truncate">{msg.fileName}</span>
            </div>
          )}
          {msg.content && (
            <div className="bg-brand text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (msg.loading) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={14} className="text-brand" />
        </div>
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles size={14} className="text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed">
          <MarkdownText text={msg.content} />
        </div>
        {msg.action && <ActionCard action={msg.action} />}
      </div>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-semibold text-foreground mt-2">{line.slice(4)}</p>;
        if (line.startsWith("## ")) return <p key={i} className="font-bold text-foreground mt-2">{line.slice(3)}</p>;
        if (line.startsWith("# ")) return <p key={i} className="font-bold text-base text-foreground mt-2">{line.slice(2)}</p>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <p key={i} className="flex gap-2">
              <span className="text-brand mt-0.5">•</span>
              <InlineMarkdown text={line.slice(2)} />
            </p>
          );
        }
        if (line === "") return <div key={i} className="h-1" />;
        return <p key={i}><InlineMarkdown text={line} /></p>;
      })}
    </div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<{ file: File; objectPath: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { uploadFile, isUploading } = useUpload();

  const history: HistoryEntry[] = messages
    .filter(m => !m.loading && m.role !== "assistant" || (m.role === "assistant" && !m.loading))
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content }));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const result = await uploadFile(file);
    if (result) {
      setPendingFile({ file, objectPath: result.objectPath });
    }
  }, [uploadFile]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text && !pendingFile) return;
    if (isSending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      fileName: pendingFile?.file.name,
      fileType: pendingFile?.file.type,
    };

    const loadingMsg: Message = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "",
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsSending(true);

    const fileObjectPath = pendingFile?.objectPath;
    const fileName = pendingFile?.file.name;
    const fileType = pendingFile?.file.type;
    setPendingFile(null);

    try {
      const resp = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          fileObjectPath,
          fileName,
          fileType,
          history: history.filter(h => h.content),
        }),
      });

      const data = await resp.json() as { reply: string; action?: ActionResult };

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, content: data.reply, action: data.action, loading: false }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, content: "Erro ao conectar com o assistente. Verifique sua conexão e tente novamente.", loading: false }
          : m
      ));
    } finally {
      setIsSending(false);
    }
  }, [input, pendingFile, isSending, history]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  return (
    <div className="-mx-8 -my-8 flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
          <Sparkles size={16} className="text-brand" />
        </div>
        <div>
          <p className="font-semibold text-sm">Copilot Ingenium</p>
          <p className="text-xs text-muted-foreground">Envie documentos ou descreva seu ativo/fundo</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-border bg-card px-6 py-4">
        {pendingFile && (
          <div className="flex items-center gap-2 mb-3 bg-brand/5 border border-brand/20 rounded-lg px-3 py-2">
            <FileText size={14} className="text-brand flex-shrink-0" />
            <span className="text-sm text-foreground flex-1 truncate">{pendingFile.file.name}</span>
            <button
              onClick={() => setPendingFile(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isSending}
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
            title="Enviar arquivo (PDF, TXT, CSV)"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); adjustHeight(); }}
              onKeyDown={handleKeyDown}
              placeholder={pendingFile ? "Descreva o arquivo ou pressione Enter para analisar…" : "Descreva seu ativo ou fundo, ou envie um arquivo…"}
              rows={1}
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand/50 focus:border-brand/50 placeholder:text-muted-foreground leading-relaxed"
              style={{ minHeight: "42px", maxHeight: "120px" }}
              disabled={isSending}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={(!input.trim() && !pendingFile) || isSending || isUploading}
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand text-white hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-2 text-center">
          Suporta PDF, TXT, CSV • Enter para enviar • Shift+Enter para nova linha
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.txt,.csv,.md,.xlsx,.docx"
        onChange={handleFileSelect}
      />
    </div>
  );
}
