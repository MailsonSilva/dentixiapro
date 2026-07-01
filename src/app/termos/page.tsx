"use client";

import { ArrowLeft, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const TERMS_TEXT = `TERMOS DE USO – DENTIX.IA

DENTIX.IA LTDA
CNPJ: 64.395.716/0001-18
Endereço: São Luís/MA
Site: www.dentixia.com.br
E-mail: dentixadm@gmail.com

──────────────────────────────────

1. ACEITAÇÃO

O uso da plataforma implica aceitação integral dos Termos.

──────────────────────────────────

2. OBJETO

Plataforma SaaS para simulações odontológicas com IA.

Inclui:
• Cadastro
• Upload de imagens
• Processamento com IA
• Dashboard
• Suporte

Não inclui:
• Diagnóstico
• Tratamento
• Telemedicina

──────────────────────────────────

3. USUÁRIO

Requisitos:
• Maior de 18 anos
• Registro no CRO

Obrigações:
• Manter dados atualizados
• Proteger acesso
• Obter consentimento de pacientes

Proibições:
• Engenharia reversa
• Conteúdo ilegal
• Uso indevido

──────────────────────────────────

4. LICENÇA

Uso limitado, não exclusivo e revogável.

──────────────────────────────────

5. PAGAMENTOS

Plano:
• R$ 197/mês
• R$ 1.970/ano

Regras:
• Sem reembolso
• Cancelamento livre
• Suspensão por inadimplência

──────────────────────────────────

6. CONTEÚDO

Usuário é responsável por:
• Consentimento do paciente
• Legalidade das imagens

──────────────────────────────────

7. PROPRIEDADE INTELECTUAL

Todo o sistema pertence à Dentix.IA.

Usuário concede licença para:
• Processamento
• Armazenamento
• Exibição

──────────────────────────────────

8. TERCEIROS

Integrações: Supabase, Hostinger, Stripe, Google, Meta, Hotjar.

──────────────────────────────────

9. RESPONSABILIDADE

• Plataforma não garante resultados clínicos
• Limite de indenização: 10x mensalidade

──────────────────────────────────

10. SUSPENSÃO

Pode ocorrer por:
• Inadimplência
• Violação
• Uso indevido

──────────────────────────────────

11. DISPOSIÇÕES FINAIS

• Alterações com aviso prévio
• Foro: São Luís/MA`;

export default function TermosPage() {
  const router = useRouter();
  const sections = TERMS_TEXT.split(/──+/);

  return (
    <div className="min-h-screen bg-secondary-bg pb-12 text-gray-800">
      <header className="bg-white px-4 py-3 flex items-center shadow-sm sticky top-0 z-50">
         <button 
           onClick={() => router.back()}
           className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
         >
            <ArrowLeft size={16} />
         </button>
         <div className="flex-1 flex items-center gap-2 pl-2">
           <Shield size={18} className="text-primary" />
           <h1 className="text-lg font-bold text-gray-800 capitalize tracking-tight">Termos de Uso</h1>
         </div>
      </header>

      <main className="w-full max-w-md mx-auto px-4 py-3">
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="space-y-4"
        >
          {sections.map((section, idx) => (
            <div key={idx}>
              {idx > 0 && <div className="w-full bg-slate-200 h-px my-3" />}
              <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                {section.trim()}
              </pre>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
