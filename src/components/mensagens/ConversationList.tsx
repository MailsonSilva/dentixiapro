"use client";

import { cn } from "@/lib/utils";
import { Search, Inbox, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Conversation } from "@/lib/mensagens/queries";
import { Avatar } from "./MessageBubble";

export function ChannelBadge({ type }: { type: string }) {
  const styles: Record<string, { bg: string; label: string }> = {
    whatsapp: { bg: "bg-emerald-100 text-emerald-700", label: "WhatsApp" },
    instagram: { bg: "bg-pink-100 text-pink-700", label: "Instagram" },
    webchat: { bg: "bg-blue-100 text-blue-700", label: "Web Chat" },
  };
  const s = styles[type] || styles.webchat;
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize tracking-wide", s.bg)}>{s.label}</span>;
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  if (diffH < 24) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffH < 48) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ConversationList({
  conversations,
  activeConvId,
  onSelect,
  loading,
  search,
  setSearch,
  showList
}: {
  conversations: Conversation[];
  activeConvId?: string;
  onSelect: (c: Conversation) => void;
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  showList: boolean;
}) {
  return (
    <div className={cn(
      "flex-shrink-0 bg-white flex flex-col transition-all duration-300 relative z-10",
      "w-full md:w-80 lg:w-96 border-r border-gray-200/60 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]",
      !showList ? "hidden md:flex" : "flex"
    )}>
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Mensagens</h2>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
            {conversations.length} conversas
          </span>
        </div>
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

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
              <Inbox size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold text-sm">Nenhuma conversa</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {conversations.map((conv, i) => (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onSelect(conv)}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 text-left transition-all group",
                  activeConvId === conv.id ? "bg-primary/5 border-l-4 border-l-primary" : ""
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
  );
}
