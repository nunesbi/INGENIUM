import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListChatRooms,
  useGetChatRoom,
  useCreateChatRoom,
  useSendMessage,
  useDeleteMessage,
  useAiReply,
  getListChatRoomsQueryKey,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Plus,
  Send,
  Paperclip,
  File,
  Trash2,
  X,
  FileText,
  Image,
  Download,
  Sparkles,
  Bot,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type ChatMessage = {
  id: number;
  roomId: number;
  sender: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  createdAt: string;
};

type ChatRoom = {
  id: number;
  title: string;
  matchId: number | null;
  fundoId: number | null;
  ativoId: number | null;
  messageCount: number;
  lastMessage: { content: string | null; sender: string; createdAt: string } | null;
  createdAt: string;
};

const SENDER_KEY = "ingenium_chat_sender";
function getSender() {
  let s = localStorage.getItem(SENDER_KEY);
  if (!s) {
    s = "Usuário";
    localStorage.setItem(SENDER_KEY, s);
  }
  return s;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ fileType }: { fileType: string | null }) {
  if (!fileType) return <File size={16} />;
  if (fileType.startsWith("image/")) return <Image size={16} />;
  if (fileType.includes("pdf")) return <FileText size={16} />;
  return <File size={16} />;
}

function AiThinkingBubble() {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[75%] flex flex-col gap-0.5 items-start">
        <span className="text-xs text-violet-400 px-1 flex items-center gap-1">
          <Bot size={12} /> Ingenium IA
        </span>
        <div className="bg-violet-900/40 border border-violet-500/30 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="text-xs text-violet-300">Analisando...</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  sender,
  onDelete,
}: {
  msg: ChatMessage;
  sender: string;
  onDelete: (id: number) => void;
}) {
  const isAi = msg.sender === "Ingenium IA";
  const isOwn = !isAi && msg.sender === sender;

  if (isAi) {
    return (
      <div className="flex justify-start mb-3 group">
        <div className="max-w-[80%] flex flex-col gap-0.5 items-start">
          <span className="text-xs text-violet-400 px-1 flex items-center gap-1">
            <Bot size={12} /> Ingenium IA
          </span>
          <div className="bg-violet-900/40 border border-violet-500/30 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-foreground shadow-sm shadow-violet-900/20">
            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
          </div>
          <span className="text-[10px] text-muted-foreground px-1">
            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group mb-3`}>
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {!isOwn && (
          <span className="text-xs text-muted-foreground px-1">{msg.sender}</span>
        )}
        <div
          className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}
        >
          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
          {msg.fileUrl && (
            <a
              href={msg.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 mt-1 rounded-lg p-2 transition-colors ${
                isOwn
                  ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                  : "bg-background/60 hover:bg-background/80"
              }`}
            >
              <FileIcon fileType={msg.fileType} />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate max-w-[180px]">
                  {msg.fileName ?? "Arquivo"}
                </span>
                {msg.fileSize && (
                  <span className={`text-[10px] ${isOwn ? "opacity-70" : "text-muted-foreground"}`}>
                    {formatFileSize(msg.fileSize)}
                  </span>
                )}
              </div>
              <Download size={14} className="ml-auto flex-shrink-0" />
            </a>
          )}
          {isOwn && (
            <button
              onClick={() => onDelete(msg.id)}
              className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const qc = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [senderName, setSenderName] = useState(getSender);
  const [pendingFile, setPendingFile] = useState<{ name: string; url: string; size: number; type: string } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: rooms = [] } = useListChatRooms<ChatRoom[]>();
  const { data: roomDetail, refetch: refetchRoom } = useGetChatRoom<{
    id: number;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
  }>(selectedRoom!, { query: { enabled: selectedRoom !== null, queryKey: ["chat-room", selectedRoom] as const } });

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (res) => {
      setPendingFile({
        name: (res.metadata as { name: string }).name,
        url: res.objectPath,
        size: (res.metadata as { size: number }).size,
        type: (res.metadata as { contentType: string }).contentType,
      });
    },
  });

  const createRoom = useCreateChatRoom({
    mutation: {
      onSuccess: (room) => {
        qc.invalidateQueries({ queryKey: getListChatRoomsQueryKey() });
        setSelectedRoom((room as ChatRoom).id);
        setNewRoomOpen(false);
        setNewRoomTitle("");
      },
    },
  });

  const sendMsg = useSendMessage({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListChatRoomsQueryKey() });
        refetchRoom();
        setText("");
        setPendingFile(null);
      },
    },
  });

  const askAi = useAiReply({
    mutation: {
      onMutate: () => setAiThinking(true),
      onSuccess: () => {
        setAiThinking(false);
        qc.invalidateQueries({ queryKey: getListChatRoomsQueryKey() });
        refetchRoom();
        setText("");
      },
      onError: () => setAiThinking(false),
    },
  });

  const deleteMsg = useDeleteMessage({
    mutation: {
      onSuccess: () => refetchRoom(),
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [roomDetail?.messages, aiThinking]);

  useEffect(() => {
    if (!selectedRoom) return;
    const interval = setInterval(() => refetchRoom(), 5000);
    return () => clearInterval(interval);
  }, [selectedRoom]);

  function handleSend() {
    if (!selectedRoom) return;
    if (!text.trim() && !pendingFile) return;
    sendMsg.mutate({
      roomId: selectedRoom,
      data: {
        sender: senderName,
        content: text.trim() || undefined,
        fileUrl: pendingFile?.url,
        fileName: pendingFile?.name,
        fileSize: pendingFile?.size,
        fileType: pendingFile?.type,
      },
    });
  }

  function handleAskAi() {
    if (!selectedRoom || !text.trim()) return;
    askAi.mutate({
      roomId: selectedRoom,
      data: { userMessage: text.trim() },
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSaveSender() {
    localStorage.setItem(SENDER_KEY, senderName);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-border flex flex-col bg-card flex-shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Conversas</h2>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setNewRoomOpen(true)}>
            <Plus size={16} />
          </Button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <Label className="text-xs text-muted-foreground">Seu nome</Label>
          <Input
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            onBlur={handleSaveSender}
            className="h-7 text-xs mt-1"
            placeholder="Seu nome"
          />
        </div>

        <ScrollArea className="flex-1">
          {(rooms as ChatRoom[]).length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              Nenhuma conversa ainda
            </div>
          ) : (
            <div className="py-2 px-2 space-y-1">
              {(rooms as ChatRoom[]).map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full text-left rounded-lg p-3 transition-colors ${
                    selectedRoom === room.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-sm truncate flex-1">{room.title}</span>
                    {room.messageCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1 flex-shrink-0">
                        {room.messageCount}
                      </Badge>
                    )}
                  </div>
                  {room.lastMessage ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {room.lastMessage.sender === "Ingenium IA" ? (
                        <span className="text-violet-400">✦ IA:</span>
                      ) : (
                        <span className="font-medium">{room.lastMessage.sender}:</span>
                      )}{" "}
                      {room.lastMessage.content ?? "📎 Arquivo"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem mensagens</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      {selectedRoom && roomDetail ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 border-b border-border px-6 flex items-center justify-between">
            <h3 className="font-semibold">{roomDetail.title}</h3>
            <div className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-900/20 border border-violet-500/20 rounded-full px-3 py-1">
              <Sparkles size={12} />
              IA disponível
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
            {roomDetail.messages.length === 0 && !aiThinking ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare size={48} className="opacity-20 mb-3" />
                <p className="text-sm">Nenhuma mensagem ainda. Diga olá! 👋</p>
                <p className="text-xs mt-2 text-violet-400/70 flex items-center gap-1">
                  <Sparkles size={11} /> Use o botão <strong>Perguntar IA</strong> para obter análises inteligentes
                </p>
              </div>
            ) : (
              <>
                {roomDetail.messages.map((msg: ChatMessage) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    sender={senderName}
                    onDelete={(id) => deleteMsg.mutate({ roomId: selectedRoom, messageId: id })}
                  />
                ))}
                {aiThinking && <AiThinkingBubble />}
              </>
            )}
          </div>

          {/* Pending file preview */}
          {pendingFile && (
            <div className="mx-6 mb-2 flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
              <FileIcon fileType={pendingFile.type} />
              <span className="truncate flex-1 text-xs font-medium">{pendingFile.name}</span>
              <span className="text-xs text-muted-foreground">{formatFileSize(pendingFile.size)}</span>
              <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-destructive">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="p-4 border-t border-border space-y-2">
            {/* AI hint */}
            <p className="text-[11px] text-muted-foreground px-1">
              💬 <strong>Enter</strong> para enviar · <Sparkles size={11} className="inline text-violet-400" /> <strong>Perguntar IA</strong> para análise inteligente
            </p>
            <div className="flex gap-2 items-end">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
              <Button
                type="button" variant="ghost" size="icon"
                className="h-9 w-9 flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Anexar arquivo"
              >
                {isUploading ? <span className="animate-spin text-xs">⏳</span> : <Paperclip size={18} />}
              </Button>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreva uma mensagem ou pergunta para a IA..."
                rows={1}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring max-h-32"
                style={{ minHeight: "36px" }}
              />

              {/* AI button */}
              <Button
                onClick={handleAskAi}
                disabled={!text.trim() || askAi.isPending || aiThinking}
                variant="outline"
                className="h-9 flex-shrink-0 gap-1.5 border-violet-500/40 text-violet-400 hover:bg-violet-900/20 hover:text-violet-300 px-3"
                title="Perguntar para a IA"
              >
                <Sparkles size={14} />
                <span className="text-xs">Perguntar IA</span>
              </Button>

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={sendMsg.isPending || (!text.trim() && !pendingFile)}
                size="icon"
                className="h-9 w-9 flex-shrink-0"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Selecione uma conversa</p>
            <p className="text-sm mt-1">Ou crie uma nova para começar</p>
            <Button className="mt-4" onClick={() => setNewRoomOpen(true)}>
              <Plus size={16} className="mr-2" />
              Nova conversa
            </Button>
          </div>
        </div>
      )}

      {/* New Room Dialog */}
      <Dialog open={newRoomOpen} onOpenChange={setNewRoomOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome da conversa</Label>
            <Input
              value={newRoomTitle}
              onChange={(e) => setNewRoomTitle(e.target.value)}
              placeholder="Ex: Negociação Torre Faria Lima"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newRoomTitle.trim()) {
                  createRoom.mutate({ data: { title: newRoomTitle.trim() } });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoomOpen(false)}>Cancelar</Button>
            <Button
              disabled={!newRoomTitle.trim() || createRoom.isPending}
              onClick={() => createRoom.mutate({ data: { title: newRoomTitle.trim() } })}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
