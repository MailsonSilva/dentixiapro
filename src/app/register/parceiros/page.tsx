"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signUpAction } from "@/lib/auth/actions";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, ArrowRight, Phone, ShieldCheck, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { useNotification } from "@/lib/NotificationContext";

import { Suspense } from "react";

function RegisterParceiroContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const router = useRouter();
  const { notify } = useNotification();

  // Máscara de WhatsApp: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let masked = digits;
    if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) {
      // Celular (11 dígitos) ou fixo (10 dígitos)
      const body = digits.length === 11
        ? `${digits.slice(2, 7)}-${digits.slice(7)}`
        : `${digits.slice(2, 6)}-${digits.slice(6)}`;
      masked = `(${digits.slice(0, 2)}) ${body}`;
    }
    setWhatsapp(masked);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      notify("Senhas divergentes", "As senhas digitadas não coincidem.", "warning");
      return;
    }

    if (!acceptedTerms) {
      notify("Termos obrigatórios", "Você precisa aceitar os termos e políticas para continuar.", "info");
      return;
    }

    setLoading(true);

    const { error } = await signUpAction({
      email,
      password,
      optionsData: {
        nome_completo: nome,
        whatsapp: whatsapp,
        user_referredbycode: null,
        tipo: "parceiro"
      }
    });

    if (error) {
      notify("Erro no cadastro", error, "error");
    } else {
      notify("Parceiro cadastrado!", "Verifique seu e-mail para ativar sua conta de parceiro.", "success");
      router.push("/login");
    }
    setLoading(false);
  };

  return (
    <>
    <div className="min-h-screen bg-secondary-bg flex items-center justify-center p-6 relative overflow-hidden py-12">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="p-6 sm:p-8 border-white/40 shadow-2xl rounded-3xl bg-white/90 backdrop-blur-md">
          <CardHeader className="flex flex-col items-center mb-6 space-y-2">
            <Image src={IMAGES.logo} alt="DentixIA" width={180} height={48} className="h-10 w-auto mb-2" priority />
            <h1 className="text-2xl font-semibold font-poppins text-gray-800 tracking-tight text-center">Seja um Parceiro</h1>
            <p className="text-gray-500 text-sm text-center font-medium leading-tight max-w-xs">Indique o DentixIA e ganhe comissões recorrentes</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                <Input
                  label="Nome Completo"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu Nome Completo"
                  icon={<User size={20} />}
                />

                <Input
                  label="WhatsApp"
                  required
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  placeholder="(00) 00000-0000"
                  icon={<Phone size={20} />}
                />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Input
                  label="E-mail Profissional"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@parceiro.com"
                  icon={<Mail size={20} />}
                />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
                <Input
                  label="Senha"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 chars"
                  icon={<Lock size={20} />}
                />

                <Input
                  label="Confirmar Senha"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  icon={<ShieldCheck size={20} />}
                />
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-start gap-2.5 p-3 bg-gray-50/80 rounded-2xl border border-gray-200 mt-2">
                <input 
                  type="checkbox" 
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-all flex-shrink-0"
                />
                <label htmlFor="terms" className="text-xs text-gray-500 leading-tight cursor-pointer select-none">
                  Eu li e aceito a{" "}
                  <button type="button" onClick={() => setShowPrivacy(true)} className="font-semibold text-gray-700 hover:text-primary underline">Política de Privacidade</button> 
                  {" "}e os{" "}
                  <button type="button" onClick={() => setShowTerms(true)} className="font-semibold text-gray-700 hover:text-primary underline">Termos de Uso</button> 
                  {" "}da DentixIA.
                </label>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full mt-4 h-12 text-base"
                  rightIcon={<ArrowRight size={18} />}
                >
                  Cadastrar como Parceiro
                </Button>
              </motion.div>
            </form>
          </CardContent>

          <CardFooter className="space-y-4 mt-6 flex flex-col items-center">
            <p className="text-center text-sm text-gray-500 w-full">
              Já possui uma conta?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline italic">
                Entrar agora
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>

      {/* Modal Política de Privacidade */}
      <AnimatePresence>
        {showPrivacy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrivacy(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Política de Privacidade</h2>
                <button onClick={() => setShowPrivacy(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={24} className="text-gray-400" /></button>
              </div>
              <div className="p-8 overflow-y-auto scrollbar-hide text-gray-600 space-y-4 text-sm leading-relaxed">
                <div className="space-y-6">
                  <div>
                    <p className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2">DENTIX.IA LTDA</p>
                    <p>CNPJ: 64.395.716/0001-18 | São Luís/MA</p>
                    <p>Site: www.dentixia.com.br</p>
                    <p><strong>Encarregado (DPO):</strong> Miguel Eulalio do Nascimento Cantanhede</p>
                    <p>E-mail: miguel_tobi@hotmail.com | Telefone: (98) 98500-0637</p>
                  </div>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">1. INTRODUÇÃO</h3>
                    <p>Esta Política de Privacidade descreve as práticas de tratamento de dados pessoais da Dentix.IA, conforme a LGPD (Lei nº 13.709/2018). Aplica-se a todos os usuários da plataforma SaaS.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">2. DEFINIÇÕES</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Dado Pessoal:</strong> Informação que identifica uma pessoa</li>
                      <li><strong>Dado Sensível:</strong> Dados sobre saúde, biometria, etc.</li>
                      <li><strong>Tratamento:</strong> Qualquer operação com dados</li>
                      <li><strong>Controlador:</strong> Dentix.IA</li>
                      <li><strong>Operador:</strong> Terceiros (ex: Supabase, Stripe)</li>
                      <li><strong>Titular:</strong> Usuário</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">3. AGENTES DE TRATAMENTO</h3>
                    <p><strong>Controlador:</strong> Dentix.IA LTDA</p>
                    <p><strong>DPO:</strong> Miguel Eulalio do Nascimento Cantanhede</p>
                    <p><strong>Operadores:</strong> Supabase, Hostinger, Stripe, Google, Meta, Hotjar.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">4. DADOS COLETADOS</h3>
                    <p className="font-bold mb-1">Obrigatórios:</p>
                    <p>Nome completo, E-mail, Telefone, Senha (criptografada).</p>
                    <p className="font-bold mb-1 mt-2">Opcionais:</p>
                    <p>Empresa, CPF/CNPJ.</p>
                    <p className="font-bold mb-1 mt-2">Durante uso:</p>
                    <p>Imagens dentárias, Histórico de simulações.</p>
                    <p className="font-bold mb-1 mt-2">Automáticos:</p>
                    <p>IP anonimizado, Navegação.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">5. FINALIDADES E BASE LEGAL</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border p-2 text-left">Finalidade</th>
                            <th className="border p-2 text-left">Base Legal</th>
                            <th className="border p-2 text-left">Retenção</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border p-2 text-left">Cadastro</td><td className="border p-2 text-left">Execução de contrato</td><td className="border p-2 text-left">Vigência + 180 dias</td></tr>
                          <tr><td className="border p-2 text-left">Pagamento</td><td className="border p-2 text-left">Obrigação legal</td><td className="border p-2 text-left">5 anos</td></tr>
                          <tr><td className="border p-2 text-left">Simulações</td><td className="border p-2 text-left">Execução de contrato</td><td className="border p-2 text-left">30 dias</td></tr>
                          <tr><td className="border p-2 text-left">Analytics</td><td className="border p-2 text-left">Legítimo interesse</td><td className="border p-2 text-left">12 meses</td></tr>
                          <tr><td className="border p-2 text-left">Suporte</td><td className="border p-2 text-left">Execução de contrato</td><td className="border p-2 text-left">1 ano</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">6. COMPARTILHAMENTO</h3>
                    <p>Apenas com operadores essenciais. Transferências internacionais (EUA/Malta). Autoridades apenas mediante ordem legal.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">7. SEGURANÇA</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Criptografia AES-256 e TLS 1.3</li>
                      <li>2FA obrigatório</li>
                      <li>Backups diários e testes de segurança</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">8. RETENÇÃO E EXCLUSÃO</h3>
                    <p>Exclusão mediante solicitação. Análise em 48h e execução em até 30 dias.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">9. DIREITOS DO TITULAR</h3>
                    <p>Acesso, Correção, Exclusão, Portabilidade e Revogação de consentimento. Solicitação: <strong>miguel_tobi@hotmail.com</strong></p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">10. INCIDENTES</h3>
                    <p>Notificação à ANPD em até 72h. Comunicação ao usuário em até 5 dias úteis.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">11. ODONTOLOGIA</h3>
                    <p>Usuário é responsável por: Consentimento do paciente e Anonimização de imagens.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">12. DISPOSIÇÕES FINAIS</h3>
                    <p>Atualizações com aviso prévio. Foro: São Luís/MA.</p>
                    <p className="text-xs text-gray-400 mt-4 italic">Última atualização: 19/12/2025.</p>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Termos de Uso */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTerms(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Termos de Uso</h2>
                <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={24} className="text-gray-400" /></button>
              </div>
              <div className="p-8 overflow-y-auto scrollbar-hide text-gray-600 space-y-4 text-sm leading-relaxed">
                <div className="space-y-6">
                  <p className="text-sm font-medium text-gray-700">PROGRAMA DE INDICAÇÃO DENTIXIA - Termos e Condições</p>
                  
                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">1. QUEM PODE PARTICIPAR</h3>
                    <p>Apenas usuários ativos e adimplentes da DentixIA. Usuários em teste gratuito ou com assinatura inativa não podem indicar. Não há limite de indicações.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">2. COMO FUNCIONA</h3>
                    <p>Cada usuário terá um link exclusivo. Apenas indicações por meio desse link são válidas. O sistema realiza o rastreamento automático até a conversão.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">3. BENEFÍCIOS</h3>
                    <p>O indicador recebe 10% do valor da mensalidade de cada indicado, enquanto este permanecer ativo. O benefício não é desconto, é pagamento via PIX.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">4. VALIDADE DA COMISSÃO</h3>
                    <p>Apenas para assinaturas ativas, pagas e validadas. Não geram comissão: testes gratuitos, inadimplentes, estornadas ou canceladas.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">5. CANCELAMENTO E CHURN</h3>
                    <p>Se o indicado cancelar, a comissão cessa imediatamente. Não há comissão proporcional para cancelamentos no meio do mês.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">6. PAGAMENTO</h3>
                    <p>Apuradas mensalmente e pagas até o 10º dia útil do mês seguinte via PIX. A DentixIA poderá definir um valor mínimo para liberação.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">7. REGRAS ANTIFRAUDE</h3>
                    <p>Proibida autoindicação e indicações entre contas com mesmo CPF/CNPJ, e-mail, cartão ou IP. Fraude resulta em bloqueio e cancelamento.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">8. PROPRIEDADE DO CLIENTE</h3>
                    <p>O indicado é cliente exclusivo da DentixIA. A indicação não gera direito sobre a base de clientes ou vínculo societário.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">9. NATUREZA E ENCERRAMENTO</h3>
                    <p>Programa de caráter promocional e revogável. A DentixIA poderá alterar ou encerrar o programa a qualquer momento mediante aviso.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">10. ALTERAÇÕES</h3>
                    <p>A DentixIA poderá alterar percentuais, regras e condições a qualquer momento, respeitando as comissões já apuradas.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">11. DISPOSIÇÕES FINAIS</h3>
                    <p>O programa não gera vínculo empregatício. A participação implica aceite integral destes termos. Uso indevido resulta em exclusão.</p>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function RegisterParceiroPage() {
  return (
    <Suspense fallback={null}>
      <RegisterParceiroContent />
    </Suspense>
  );
}
