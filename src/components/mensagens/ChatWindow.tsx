"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, ChevronLeft, Bot, MoreVertical, Send, Smile, Loader2 } from "lucide-react";

import { useEffect } from "react";
import { Message, Conversation } from "@/lib/mensagens/queries";
import { Avatar, MessageBubble } from "./MessageBubble";
import { ChannelBadge } from "./ConversationList";

export function ChatWindow({
  activeConv,
  messages,
  loadingMsgs,
  text,
  setText,
  sending,
  onSend,
  onToggleBot,
  onBack,
  bottomRef,
}: {
  activeConv: Conversation | null;
  messages: Message[];
  loadingMsgs: boolean;
  text: string;
  setText: (t: string) => void;
  sending: boolean;
  onSend: () => void;
  onToggleBot: () => void;
  onBack: () => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Scroll automático ao receber nova mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bottomRef]);

  if (!activeConv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center">
          <MessageSquare size={40} className="text-primary/30" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-700">Selecione uma conversa</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-xs">
            Escolha uma conversa na lista para ver o histórico de mensagens e responder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <Avatar name={activeConv.contacts?.name || "?"} online />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 leading-tight">
            {activeConv.contacts?.name || "Desconhecido"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <ChannelBadge type={activeConv.communication_channels?.type || "whatsapp"} />
            {activeConv.contacts?.phone && <p className="text-xs text-gray-400">{activeConv.contacts.phone}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleBot}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
              activeConv.bot_enabled !== false
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-red-50 text-red-600 border-red-200"
            )}
          >
            <Bot size={14} />
            <span className="hidden sm:inline">
              {activeConv.bot_enabled !== false ? "Robô ON" : "Robô OFF"}
            </span>
          </button>
          <button className="p-2.5 text-gray-400 hover:bg-primary/5 hover:text-primary rounded-xl transition-all">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto scrolling-touch px-4 py-6 space-y-2 bg-[#f8fafc]"
        style={{
          backgroundImage: "radial-gradient(at 0% 0%, rgba(15,80,166,0.03) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(17,160,217,0.03) 0, transparent 50%)"
        }}
      >
        {loadingMsgs ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare size={24} className="text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm font-medium">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const showDateDivider = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
              return (
                <div key={msg.id}>
                  {showDateDivider && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[10px] font-bold text-gray-400 capitalize tracking-wide bg-gray-100 px-3 py-1 rounded-full">
                        {new Date(msg.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  <MessageBubble msg={msg} />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-4 bg-white border-t border-gray-100 flex-shrink-0">
        <div className="flex items-end gap-3 bg-gray-50 rounded-2xl px-4 py-3 border-2 border-gray-100 focus-within:border-primary/30 transition-all">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Digite uma mensagem..."
            rows={1}
            className="flex-1 bg-transparent border-0 ring-0 px-0 outline-none resize-none text-base"
          />
          <button className="p-1.5 text-gray-400 hover:text-primary">
            <Smile size={18} />
          </button>
          <button
            onClick={onSend}
            disabled={!text.trim() || sending}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              text.trim() && !sending ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
            )}
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
