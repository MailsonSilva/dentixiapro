"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/lib/NotificationContext";

// Data Layers (SSD)
import { 
  getConversations, getMessages, 
  Conversation, Message 
} from "@/lib/mensagens/queries";
import { sendMessageAction, toggleBotState } from "@/lib/mensagens/actions";

// UI Components (Refatorados)
import { ConversationList } from "@/components/mensagens/ConversationList";
import { ChatWindow } from "@/components/mensagens/ChatWindow";

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

  /**
   * Inicialização e Busca de Conversas
   */
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: uc } = await supabase.from("user_company").select("company_id").eq("user_id", user.id).eq("active", true).single();
        if (!uc) return;
        setCompanyId(uc.company_id);

        const data = await getConversations(uc.company_id);
        setConversations(data);
      } catch (err: unknown) {
        const error = err as Error;
        notify("Erro", error.message, "error");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [notify]);

  const handleLoadMessages = useCallback(async (conv: Conversation) => {
    setLoadingMsgs(true);
    setActiveConv(conv);
    setShowList(false);
    try {
      const msgs = await getMessages(conv.id);
      setMessages(msgs);
    } catch {
      notify("Erro", "Falha ao carregar histórico", "error");
    } finally {
      setLoadingMsgs(false);
    }
  }, [notify]);

  // Ref Realtime
  const activeConvRef = useRef<Conversation | null>(null);
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  /**
   * Realtime Channel (Global)
   */
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`team_chat_${companyId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "n8n_chat_histories" }, (payload) => {
        const row = payload.new;
        const currentActive = activeConvRef.current;
        
        // n8n salva como JSON no formato {"type": "human"|"ai", "data": {"content": "..."}}
        const type = row.message?.type || "human";
        const content = row.message?.data?.content || row.message?.content || "";
        
        const newMsg: Message = {
          id: String(row.id),
          conversation_id: row.conversation_id || row.session_id,
          direction: type === "human" ? "inbound" : "outbound",
          message: {
            text: content,
            type: "text",
            source: type === "ai" ? "ai" : undefined
          },
          created_at: row.hora_data_mensagem || new Date().toISOString()
        };

        if (currentActive && newMsg.conversation_id === currentActive.id) {
          setMessages(prev => {
            const exists = prev.find(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
        }

        // Atualizar lista de conversas
        setConversations(prev => {
          const target = prev.find(c => c.id === newMsg.conversation_id);
          if (target) {
            const others = prev.filter(c => c.id !== newMsg.conversation_id);
            return [{ ...target, last_message_at: newMsg.created_at }, ...others];
          }
          return prev;
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, async () => {
        // Nova conversa foi gerada no backend automaticamente (ex: pelo trigger do N8N)
        
        // As vezes payload vem quebrado sem os relacionamentos cruzados, 
        // ideal fazer um refetch ou simular:
        try {
            const fresh = await getConversations(companyId);
            setConversations(fresh);
        } catch {
            // Ignorar erro do refetch silenciosamente
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, (payload) => {
        const updated = payload.new as Conversation;
        setConversations(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
        if (activeConvRef.current?.id === updated.id) {
            setActiveConv(prev => prev ? { ...prev, ...updated } : prev);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  /**
   * Envio de mensagem
   */
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
      await sendMessageAction({
        text: msgText,
        conversationId: activeConv.id,
        companyId,
        contactId: activeConv.contact_id,
        channelIdentifier: activeConv.communication_channels.identifier,
        phone: activeConv.contacts.phone || ""
      });
      // Sincronização virá via Realtime
    } catch (err: unknown) {
      const error = err as Error;
      notify("Erro", error.message, "error");
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  const handleToggleBot = async () => {
    if (!activeConv) return;
    const nextState = !activeConv.bot_enabled;
    try {
      await toggleBotState(activeConv.id, nextState);
      notify(nextState ? "Robô Ativo" : "Controle Manual", nextState ? "IA respondendo." : "Você assumiu o chat.", "success");
    } catch {
      notify("Erro", "Falha ao alternar Bot", "error");
    }
  };

  const filtered = conversations.filter(c =>
    (c.contacts?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full bg-secondary-bg overflow-hidden relative">
      <ConversationList 
        conversations={filtered}
        activeConvId={activeConv?.id}
        onSelect={handleLoadMessages}
        loading={loading}
        search={search}
        setSearch={setSearch}
        showList={showList}
      />

      <ChatWindow 
        activeConv={activeConv}
        messages={messages}
        loadingMsgs={loadingMsgs}
        text={text}
        setText={setText}
        sending={sending}
        onSend={handleSend}
        onToggleBot={handleToggleBot}
        onBack={() => { setShowList(true); setActiveConv(null); }}
        bottomRef={bottomRef}
      />
    </div>
  );
}
