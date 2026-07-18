"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signUpAction } from "@/lib/auth/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Mail, Lock, ArrowRight, Tag, Phone, ShieldCheck, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { useNotification } from "@/lib/NotificationContext";

import { Suspense } from "react";

function RegisterContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const searchParams = useSearchParams();
  const [refCode, setRefCode] = useState(searchParams?.get("ref") || "");
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
    
    if (!nome.trim()) {
      notify("Nome obrigatório", "Preencha seu nome completo.", "warning");
      return;
    }

    if (!whatsapp.trim() || whatsapp.length < 14) {
      notify("WhatsApp obrigatório", "Preencha um número de WhatsApp válido.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      notify("Senhas divergentes", "As senhas digitadas não coincidem.", "warning");
      return;
    }

    if (password.length < 6) {
      notify("Senha muito curta", "A senha deve ter ao menos 6 caracteres.", "warning");
      return;
    }

    if (!acceptedTerms) {
      notify("Termos obrigatórios", "Você precisa aceitar os termos e políticas para continuar.", "info");
      return;
    }

    setLoading(true);

    const { data, error } = await signUpAction({
      email,
      password,
      optionsData: {
        nome_completo: nome.trim(),
        full_name: nome.trim(), // compatibilidade OAuth
        whatsapp: whatsapp,
        telefone: whatsapp,
        user_referredbycode: refCode || null,
        tipo: "comum",
        commission_rate: 10
      }
    });

    if (error) {
      notify("Erro no cadastro", error, "error");
      setLoading(false);
      return;
    }

    notify("Conta criada!", "Verifique seu e-mail para confirmar o cadastro.", "success");
    router.push("/login");
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
            <Image src="/logo.png" alt="DentixIA" width={180} height={48} className="h-10 w-auto mb-2" priority />
            <h1 className="text-2xl font-semibold font-poppins text-gray-800 tracking-tight text-center">Crie sua Conta</h1>
            <p className="text-gray-500 text-sm text-center">Sua jornada digital começa aqui</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                <Input
                  label="Nome Completo"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Dr(a). Nome Sobrenome"
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
                  placeholder="seu@email.com"
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
                  placeholder="Mínimo 6 caracteres"
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

              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <Input
                  label="Código de Indicação (Opcional)"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  placeholder="DENTIX-XXXX"
                  icon={<Tag size={20} />}
                />
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-start gap-3 p-4 bg-gray-50/80 rounded-2xl border border-gray-200 mt-2">
                <input 
                  type="checkbox" 
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-all"
                />
                <label htmlFor="terms" className="text-sm text-gray-500 leading-relaxed cursor-pointer select-none">
                  Eu li e aceito a{" "}
                  <button type="button" onClick={() => setShowPrivacy(true)} className="font-bold text-gray-700 hover:text-primary underline">Política de Privacidade</button> 
                  {" "}e os{" "}
                  <button type="button" onClick={() => setShowTerms(true)} className="font-bold text-gray-700 hover:text-primary underline">Termos de Uso</button> 
                  {" "}da DentixIA.
                </label>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full mt-4 h-12 text-base"
                  rightIcon={<ArrowRight size={18} />}
                >
                  Finalizar Cadastro
                </Button>
              </motion.div>
            </form>
          </CardContent>

          <CardFooter className="space-y-4 mt-6 flex flex-col items-center">
            <p className="text-center text-sm text-gray-500 w-full">
              Já possui uma conta?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline italic">
                Acesse aqui
              </Link>
            </p>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-xs capitalize font-semibold tracking-widest"><span className="bg-white/90 px-4 text-gray-400">OU</span></div>
            </div>
            <p className="text-center w-full">
              <Link href="/register/parceiros" className="text-gray-500 hover:text-primary transition-all text-sm font-medium">
                Seja um <span className="font-semibold text-gray-700">Parceiro DentixIA</span>
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
                  <div>
                    <p className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2">DENTIX.IA LTDA</p>
                    <p>CNPJ: 64.395.716/0001-18 | dentixadm@gmail.com</p>
                    <p>Site: www.dentixia.com.br</p>
                    <p>São Luís/MA</p>
                  </div>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">1. ACEITAÇÃO</h3>
                    <p>O uso da plataforma implica aceitação integral dos Termos.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">2. OBJETO</h3>
                    <p>Plataforma SaaS para simulações odontológicas com IA.</p>
                    <p className="font-bold mt-2">Inclui:</p>
                    <p>Cadastro, Upload de imagens, Processamento com IA, Dashboard e Suporte.</p>
                    <p className="font-bold mt-2 text-red-500">Não inclui:</p>
                    <p>Diagnóstico, Tratamento e Telemedicina.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">3. USUÁRIO</h3>
                    <p><strong>Requisitos:</strong> Maior de 18 anos e Registro no CRO.</p>
                    <p><strong>Obrigações:</strong> Manter dados atualizados, proteger acesso e obter consentimento de pacientes.</p>
                    <p><strong>Proibições:</strong> Engenharia reversa, conteúdo ilegal e uso indevido.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">4. LICENÇA</h3>
                    <p>Uso limitado, não exclusivo e revogável.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">5. PAGAMENTOS</h3>
                    <p><strong>Plano:</strong> R$ 197/mês ou R$ 1.970/ano.</p>
                    <p><strong>Regras:</strong> Sem reembolso, cancelamento livre e suspensão por inadimplência.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">6. CONTEÚDO</h3>
                    <p>Usuário é responsável por: Consentimento do paciente e Legalidade das imagens.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">7. PROPRIEDADE INTELECTUAL</h3>
                    <p>Todo o sistema pertence à Dentix.IA. Usuário concede licença para Processamento, Armazenamento e Exibição.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">8. TERCEIROS</h3>
                    <p>Integrações: Supabase, Hostinger, Stripe, Google, Meta, Hotjar.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">9. RESPONSABILIDADE</h3>
                    <p>A plataforma não garante resultados clínicos. Limite de indenização: 10x mensalidade.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">10. SUSPENSÃO</h3>
                    <p>Pode ocorrer por: Inadimplência, Violação e Uso indevido.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 capitalize text-xs tracking-widest">11. DISPOSIÇÕES FINAIS</h3>
                    <p>Alterações com aviso prévio. Foro: São Luís/MA.</p>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
