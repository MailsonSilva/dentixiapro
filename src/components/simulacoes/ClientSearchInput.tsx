"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, UserPlus, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ContactSuggestion {
  id: string;
  name: string;
}

interface ClientSearchInputProps {
  contacts: ContactSuggestion[];
  onSelect: (contactId: string | null, name: string) => void;
  initialName?: string;
}

export function ClientSearchInput({ contacts, onSelect, initialName = "" }: ClientSearchInputProps) {
  const [query, setQuery] = useState(initialName);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim().length >= 1
    ? contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 7)
    : [];

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedId(null);
    onSelect(null, val);
    setOpen(val.trim().length > 0);
  }, [onSelect]);

  const handleSelect = useCallback((contact: ContactSuggestion) => {
    setQuery(contact.name);
    setSelectedId(contact.id);
    onSelect(contact.id, contact.name);
    setOpen(false);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    setQuery("");
    setSelectedId(null);
    onSelect(null, "");
    setOpen(false);
  }, [onSelect]);

  const isNew = query.trim().length > 0 && !selectedId && filtered.length === 0;

  return (
    <div ref={containerRef} className="relative w-full font-['Poppins']">
      {/* Input principal */}
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all
        ${selectedId
          ? "border-[#0f50a6] bg-[#0f50a6]/5"
          : open
            ? "border-[#0f50a6]/50 bg-white shadow-lg"
            : "border-gray-100 bg-gray-50/50"
        }
      `}>
        {/* Ícone lupa com cor exigida */}
        <Search
          size={18}
          className="flex-shrink-0"
          style={{ color: "#0f50a6" }}
        />

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length > 0 && setOpen(true)}
          placeholder="Buscar ou digitar nome do paciente..."
          className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-700 placeholder-gray-400 font-['Poppins']"
        />

        {/* Badge de selecionado ou botão limpar */}
        <AnimatePresence>
          {selectedId && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 text-[10px] font-semibold text-[#0f50a6] bg-[#0f50a6]/10 px-2 py-0.5 rounded-full"
            >
              <Check size={10} />
              Vinculado
            </motion.span>
          )}
          {isNew && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap"
            >
              <UserPlus size={10} />
              Novo cadastro
            </motion.span>
          )}
        </AnimatePresence>

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Card de Sugestões — nunca um popup/modal */}
      <AnimatePresence>
        {open && (filtered.length > 0) && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="
              absolute top-full left-0 right-0 mt-2 z-50
              bg-white rounded-2xl shadow-2xl border border-gray-100
              overflow-hidden
            "
          >
            <ul className="max-h-60 overflow-y-auto divide-y divide-gray-50 py-1">
              {filtered.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // evita blur antes do click
                    onClick={() => handleSelect(contact)}
                    className="
                      w-full flex items-center gap-3 px-4 py-3
                      text-left text-sm font-['Poppins'] font-medium text-gray-700
                      hover:bg-[#0f50a6]/5 hover:text-[#0f50a6]
                      transition-colors duration-150
                    "
                  >
                    <span
                      className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: "#0f50a6" }}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate">{contact.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
