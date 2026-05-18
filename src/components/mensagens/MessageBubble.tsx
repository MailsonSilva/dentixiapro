"use client";

import { cn } from "@/lib/utils";
import { Bot, CheckCheck, Mic, User } from "lucide-react";
import { motion } from "framer-motion";
import { Message } from "@/lib/mensagens/queries";

export function Avatar({ name, online = false }: { name: string; online?: boolean }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const palette = ["#6366f1", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#0F50A6", "#ef4444"];
  const color = palette[name.charCodeAt(0) % palette.length];
  return (
    <div className="relative flex-shrink-0">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-semibold text-white text-sm" style={{ backgroundColor: color }}>
        {initials}
      </div>
      {online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />}
    </div>
  );
}

function getBubbleType(msg: Message): "ai" | "agent" | "customer" {
  if (msg.direction !== "outbound") return "customer";
  if (msg.message?.source === "ai") return "ai";
  return "agent";
}

export function MessageBubble({ msg }: { msg: Message }) {
  const kind = getBubbleType(msg);
  const isOut = kind !== "customer";
  const isAudio = msg.message?.type === "audio";

  const bubbleClass = {
    ai: "bg-violet-50 text-violet-900 border border-violet-100 rounded-br-sm",
    agent: "bg-primary text-white rounded-br-sm",
    customer: "bg-white text-gray-800 rounded-bl-sm border border-gray-100",
  }[kind];

  const timeClass = {
    ai: "text-violet-400",
    agent: "text-white/60",
    customer: "text-gray-400",
  }[kind];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-end gap-2 group", isOut ? "flex-row-reverse" : "flex-row")}
    >
      {kind === "ai" && (
        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 border border-violet-200">
          <Bot size={13} className="text-violet-500" />
        </div>
      )}
      {kind === "customer" && (
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
          <User size={13} className="text-gray-400" />
        </div>
      )}

      <div className={cn("max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm relative", bubbleClass)}>
        {kind === "ai" && (
          <div className="flex items-center gap-1 mb-1">
            <Bot size={9} className="text-violet-400" />
            <span className="text-[9px] font-bold text-violet-400 tracking-widest uppercase">Maria IA</span>
          </div>
        )}
        {kind === "agent" && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] font-bold text-white/50 tracking-widest uppercase">Atendente</span>
          </div>
        )}

        {isAudio ? (
          <div className="min-w-52">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mic size={16} />
              <span>{msg.message?.text || "Audio recebido"}</span>
              {msg.message?.seconds ? (
                <span className="text-[10px] opacity-60">{msg.message.seconds}s</span>
              ) : null}
            </div>
            {msg.message?.media_url ? (
              <audio controls preload="none" src={msg.message.media_url} className="mt-2 w-full h-9" />
            ) : (
              <p className="text-[11px] opacity-60 mt-1">
                Audio salvo sem URL publica. Use a transcricao do n8n/Evolution quando disponivel.
              </p>
            )}
          </div>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {(msg.message?.text || "Mensagem sem conteudo").split(/\\n|\n/).map((line, idx, arr) => (
              <span key={idx}>
                {line}
                {idx < arr.length - 1 && <br />}
              </span>
            ))}
          </div>
        )}

        <div className={cn("flex items-center gap-1 mt-1 justify-end", timeClass)}>
          <span className="text-[10px]">
            {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isOut && <CheckCheck size={12} />}
          {msg.delivery_status === "failed" && <span className="text-[10px]">falhou</span>}
        </div>
      </div>
    </motion.div>
  );
}
