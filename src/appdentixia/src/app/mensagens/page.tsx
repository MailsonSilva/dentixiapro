"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, MessageSquare, MoreVertical,
  ChevronLeft, Smile, Clock, CheckCheck,
  Inbox, Bot,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useNotification } from "@/lib/NotificationContext";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
}

interface Channel {
  id: string;
  type: string;
  name: string | null;
  identifier: string;
}

interface Conversation {
  id: string;
  contact_id: string;
  channel_id: string;
  last_message_at: string;
  status: string;
  bot_enabled?: boolean;
  contacts: Contact;
  communication_channels: Channel;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  message: { text?: string; type?: string; source?: string };
  created_at: string;
}

function Avatar({ name, online = false }: { name: string; online?: boolean }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const palette = ["#6366f1", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#0F50A6", "#ef4444"];
  const color = palette[name.charCodeAt(0) % palette.length];
  return (
    <div className="relative flex-shrink-0">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm" style={{ backgroundColor: color }}>
        {initials}
      </div>
      {online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />}
    </div>
  );
}

function ChannelBadge({ type }: { type: string }) {
  const styles: Record<string, { bg: string; label: string }> = {
    whatsapp: { bg: "bg-emerald-100 text-emerald-700", label: "WhatsApp" },
    instagram: { bg: "bg-pink-100 text-pink-700", label: "Instagram" },
    webchat: { bg: "bg-blue-100 text-blue-700", label: "Web Chat" },
  };
  const s = styles[type] || styles.webchat;
  return <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide", s.bg)}>{s.label}</span>;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  if (diffH < 24) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffH < 48) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function MensagensPage() {
  const { notify } = useNotification();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [showList, setShowList] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Init
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: uc } = await supabase.from("user_company").select("company_id").eq("user_id", user.id).eq("active", true).single();
      if (!uc) return;
      setCompanyId(uc.company_id);

      const { data } = await supabase
        .from("conversations")
        .select(`*, contacts(id, name, phone), communication_channels(id, type, name, identifier)`)
        .eq("company_id", uc.company_id)
        .order("last_message_at", { ascending: false });
      setConversations((data || []) as Conversation[]);
      setLoading(false);
    };
    init();
  }, []);

  // Carregar mensagens
  const loadMessages = useCallback(async (conv: Conversation) => {
    setLoadingMsgs(true);
    setActiveConv(conv);
    setShowList(false);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    setMessages((data || []) as Message[]);
    setLoadingMsgs(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Referência do chat ativo para uso no Realtime (evitar re-subscribe constante)
  const activeConvRef = useRef<Conversation | null>(null);
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // Realtime Global
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`team_messages_${companyId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          const currentActive = activeConvRef.current;
          
          // 1. Atualizar o Chat (caso esteja com ele aberto)
          if (currentActive && newMsg.conversation_id === currentActive.id) {
            setMessages(prev => {
              if (newMsg.direction === "outbound") {
                // Remover ou substituir o envio otimista (temp-)
                const tempIndex = prev.findIndex(m => String(m.id).startsWith("temp-") && m.message?.text === newMsg.message?.text);
                if (tempIndex >= 0) {
                  const arr = [...prev];
                  arr.splice(tempIndex, 1, newMsg);
                  return arr;
                }
              }
              if (prev.some(m => m.id === newMsg.id)) return prev;
              const novaLista = [...prev, newMsg];
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
              return novaLista;
            });
          }

          // 2. Atualizar o Sidebar (ordenação e preview)
          setConversations(prev => {
            const exists = prev.find(c => c.id === newMsg.conversation_id);
            if (exists) {
              const updated = { ...exists, last_message_at: newMsg.created_at };
              const others = prev.filter(c => c.id !== newMsg.conversation_id);
              return [updated, ...others].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
            } else {
              // Buscar nova conversa
              supabase.from("conversations")
                .select(`*, contacts(id, name, phone), communication_channels(id, type, name, identifier)`)
                .eq("id", newMsg.conversation_id)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setConversations(curr => {
                      if (curr.some(c => c.id === data.id)) return curr;
                      return [data as Conversation, ...curr].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
                    });
                  }
                });
              return prev;
            }
          });
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          // Reflete remotamente bot_enabled e last_message_at alterados pelo webhook ou outro cliente
          const updated = payload.new as Partial<Conversation> & { id: string };
          setConversations(prev =>
            prev.map(c =>
              c.id === updated.id
                ? { ...c, ...updated }
                : c
            ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
          );
          // Se a conversa atualizada estiver ativa, sincroniza bot_enabled no header do chat
          setActiveConv(prev =>
            prev && prev.id === updated.id ? { ...prev, ...updated } : prev
          );
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const handleSend = async () => {
    if (!text.trim() || !activeConv || sending) return;
    setSending(true);
    const msgText = text.trim();
    setText("");

    // Otimista
    const tempMsg: Message = {
      id: `temp-${Date.now()}`, conversation_id: activeConv.id,
      direction: "outbound", message: { text: msgText, type: "text" },
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      // 1. Enviar para WhatsApp/Evolution primeiro
      if (!activeConv.communication_channels?.identifier) {
        throw new Error("Canal não encontrado. Verifique a instância nas configurações.");
      }
      if (!activeConv.contacts?.phone) {
        throw new Error("O Contato não possui um número de telefone salvo.");
      }

      const res = await fetch("/api/evolution/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msgText,
          phone: activeConv.contacts.phone,
          instance: activeConv.communication_channels.identifier,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData?.error || "Falha do Evolution API");
      }

      // 2. Tendo sucesso, persiste no banco de dados CRM Dentixia
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        company_id: companyId,
        contact_id: activeConv.contact_id,
        direction: "outbound",
        message: { text: msgText, type: "text" },
      });
      if (error) throw error;

      await supabase.from("conversations").update({ 
          last_message_at: new Date().toISOString(),
          bot_enabled: false 
      }).eq("id", activeConv.id);

      if (activeConv.bot_enabled !== false) {
        setActiveConv(prev => prev ? { ...prev, bot_enabled: false } : prev);
        setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, bot_enabled: false } : c));
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Mensagem não enviada.";
      notify("Erro", msg, "error");
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter(c =>
    (c.contacts?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.contacts?.phone || "").includes(search)
  );

  return (
    <div className="flex h-full bg-secondary-bg overflow-hidden relative">
      {/* === SIDEBAR lista de conversas === */}
      <div className={cn(
        "flex-shrink-0 bg-white flex flex-col transition-all duration-300 relative z-10",
        "w-full md:w-80 lg:w-96 border-r border-gray-200/60 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]",
        !showList ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="p-5 border-b border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-800">Mensagens</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{conversations.length} conversas</span>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 !py-2.5 !text-sm !rounded-xl !border-2 !border-gray-100 bg-gray-50 focus:!border-primary/30"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Inbox size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-bold text-sm">Nenhuma conversa</p>
              <p className="text-gray-400 text-xs mt-1 max-w-[180px]">As mensagens recebidas via WhatsApp aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((conv, i) => (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => loadMessages(conv)}
                  className={cn(
                    "w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 text-left transition-all group",
                    activeConv?.id === conv.id ? "bg-primary/5 border-l-4 border-l-primary" : ""
                  )}
                >
                  <Avatar name={conv.contacts?.name || "?"} online={conv.status === "active"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-sm text-gray-800 truncate">{conv.contacts?.name || "Desconhecido"}</p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 flex items-center gap-1">
                        <Clock size={9} />{formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ChannelBadge type={conv.communication_channels?.type || "whatsapp"} />
                      {conv.contacts?.phone && (
                        <span className="text-[11px] text-gray-400 truncate">{conv.contacts.phone}</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* === ÁREA DE CHAT === */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-[#f8fafc]",
        showList && !activeConv ? "hidden md:flex" : "flex"
      )}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center">
              <MessageSquare size={40} className="text-primary/30" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-700">Selecione uma conversa</h3>
              <p className="text-gray-400 text-sm mt-1 max-w-xs">Escolha uma conversa na lista para ver o histórico de mensagens e responder.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
              <button onClick={() => { setShowList(true); setActiveConv(null); }} className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <Avatar name={activeConv.contacts?.name || "?"} online />
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-800 leading-tight">{activeConv.contacts?.name || "Desconhecido"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <ChannelBadge type={activeConv.communication_channels?.type || "whatsapp"} />
                  {activeConv.contacts?.phone && (
                    <p className="text-xs text-gray-400">{activeConv.contacts.phone}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Bot Toggle */}
                <button 
                  onClick={async () => {
                    const nextState = !activeConv.bot_enabled;
                    setActiveConv({ ...activeConv, bot_enabled: nextState });
                    setConversations(conversations.map(c => c.id === activeConv.id ? { ...c, bot_enabled: nextState } : c));
                    await supabase.from("conversations").update({ bot_enabled: nextState }).eq("id", activeConv.id);
                    notify(nextState ? "Robô Ativo" : "Pausado", nextState ? "A IA Maria voltará a responder." : "Você assumiu o atendimento.", nextState ? "success" : "warning");
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
                    activeConv.bot_enabled !== false 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" 
                      : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  )}
                  title={activeConv.bot_enabled !== false ? "Maria Responde" : "Você está no controle"}
                >
                  <Bot size={14} />
                  <span className="hidden sm:inline">{activeConv.bot_enabled !== false ? "Robô ON" : "Robô OFF"}</span>
                </button>


                <button className="p-2.5 text-gray-400 hover:bg-primary/5 hover:text-primary rounded-xl transition-all" title="Mais opções">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 bg-[#f8fafc]"
              style={{
                backgroundImage: "radial-gradient(at 0% 0%, rgba(15,80,166,0.03) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(17,160,217,0.03) 0, transparent 50%)"
              }}
            >
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <MessageSquare size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-gray-300 text-xs mt-1">Inicie a conversa pelo campo abaixo</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isOut = msg.direction === "outbound";
                    const prev = messages[i - 1];
                    const showDateDivider = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                    return (
                      <div key={msg.id}>
                        {showDateDivider && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide bg-gray-100 px-3 py-1 rounded-full">
                              {new Date(msg.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("flex items-end gap-2 group", isOut ? "flex-row-reverse" : "flex-row")}
                        >
                          {!isOut && (
                            <Avatar name={activeConv.contacts?.name || "?"} />
                          )}
                          <div className={cn(
                            "max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm relative",
                            isOut
                              ? "bg-primary text-white rounded-br-sm"
                              : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                          )}>
                            {/* Badge de origem da mensagem (IA vs manual) */}
                            {isOut && msg.message?.source === "ai" && (
                              <div className="flex items-center gap-1 mb-1.5">
                                <Bot size={10} className="text-white/70" />
                                <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">Maria IA</span>
                              </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message?.text || JSON.stringify(msg.message)}</p>
                            <div className={cn("flex items-center gap-1 mt-1 justify-end", isOut ? "text-white/60" : "text-gray-400")}>
                              <span className="text-[10px]">{new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                              {isOut && <CheckCheck size={12} className="text-white/60" />}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="px-4 py-4 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex items-end gap-3 bg-gray-50 rounded-2xl px-4 py-3 border-2 border-gray-100 focus-within:border-primary/30 transition-all">

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Digite uma mensagem... (Enter para enviar)"
                  rows={1}
                  className="flex-1 bg-transparent !border-0 !ring-0 !rounded-none !px-0 !py-0 !shadow-none resize-none text-sm text-gray-800 placeholder-gray-400 outline-none max-h-32 min-h-0"
                  style={{ border: "none" }}
                />
                <button className="p-1.5 text-gray-400 hover:text-primary transition-colors flex-shrink-0">
                  <Smile size={18} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className={cn(
                    "p-2.5 rounded-xl transition-all flex-shrink-0",
                    text.trim() && !sending
                      ? "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-95"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
