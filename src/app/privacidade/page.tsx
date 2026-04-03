"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const PRIVACY_TEXT = `POLÍTICA DE PRIVACIDADE – DENTIX.IA

DENTIX.IA LTDA
CNPJ: 64.395.716/0001-18
Endereço: São Luís/MA
Site: www.dentixia.com.br
E-mail: dentixadm@gmail.com

──────────────────────────────────

1. INFORMAÇÕES GERAIS

A Dentix.IA compromete-se a proteger a privacidade e os dados pessoais de todos os nossos usuários. Esta política descreve como coletamos, usamos e protegemos suas informações de acordo com a LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018).

──────────────────────────────────

2. DADOS COLETADOS

Coletamos os seguintes tipos de dados:
• Dados Cadastrais: Nome, e-mail, telefone, CPF, CRO, dados da clínica.
• Dados de Pagamento: Informações de cartão processadas via Stripe (não armazenamos dados completos de cartão).
• Dados Clínicos: Imagens radiográficas ou fotográficas de pacientes, enviadas pelo usuário exclusivamente para fins de simulação utilizando Inteligência Artificial.
• Dados de Navegação: Endereço IP, cookies e histórico de navegação.

──────────────────────────────────

3. FINALIDADE DO USO DOS DADOS

• Permitir o acesso e uso da plataforma SaaS.
• Processamento de imagens através de nossa IA para gerar simulações odontológicas.
• Comunicação sobre suporte, cobrança e novidades.
• Melhoria de algoritmos (quando expressamente anonimizados e mediante consentimento).

──────────────────────────────────

4. COMPARTILHAMENTO DE DADOS

Não vendemos seus dados. Os dados são compartilhados apenas com:
• Provedores de hospedagem cloud (ex: Hostinger).
• Serviços de banco de dados e autenticação (ex: Supabase).
• Gateways de pagamento (ex: Stripe).
• Ferramentas de análise e suporte (ex: Google Analytics, Meta, Hotjar).

──────────────────────────────────

5. OBJETIVOS E OBRIGAÇÕES DO USUÁRIO

Como profissional de odontologia, o usuário declara e garante que:
• Possui o consentimento livre e esclarecido dos seus pacientes para o envio de suas imagens à nossa plataforma.
• É o exclusivo responsável pelo resguardo do sigilo paciente-dentista em relação a quaisquer dados imputados no sistema.

──────────────────────────────────

6. SEGURANÇA DOS DADOS

Utilizamos de certificados de segurança SSL e banco de dados criptografado. Todas as transmissões de imagem para a IA ocorrem de maneira segura e transiente.

──────────────────────────────────

7. RETENÇÃO E EXCLUSÃO

Os dados de cadastro serão mantidos enquanto a conta estiver ativa. Imagens processadas podem ser deletadas pelo próprio usuário em seu painel. Para exclusão definitiva de todos os dados do banco de dados, o usuário pode solicitar através do nosso e-mail de suporte.

──────────────────────────────────

8. DIREITOS DO TITULAR

Você tem direito a solicitar:
• Confirmação da existência de tratamento.
• Acesso aos dados.
• Correção de dados incompletos.
• Exclusão dos dados processados (respeitados os prazos legais de guarda).

──────────────────────────────────

9. ALTERAÇÕES NA POLÍTICA

A Dentix.IA pode alterar esta Política de Privacidade a qualquer momento, visando seu aprimoramento e melhoria, bem como acompanhando alterações legislativas. Usuários serão notificados em caso de mudanças relevantes.`;

export default function PrivacidadePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-secondary-bg pb-24 md:pb-12 text-gray-800">
      <header className="bg-white px-6 py-5 flex items-center shadow-sm sticky top-0 z-50">
         <button 
           onClick={() => router.back()}
           className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
         >
            <ArrowLeft size={20} />
         </button>
         <div className="flex-1 flex justify-center items-center gap-2 -ml-10">
           <ShieldCheck size={22} className="text-primary" />
           <h1 className="text-lg font-semibold text-gray-800 capitalize tracking-wide">Privacidade</h1>
         </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-6 py-10">
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 sm:p-12"
        >
          <pre className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">
            {PRIVACY_TEXT}
          </pre>
        </motion.div>
      </main>
    </div>
  );
}
