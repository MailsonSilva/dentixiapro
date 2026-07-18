"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getPlansAction, getPlanosUserDataAction, createCheckoutSessionAction } from "@/lib/planos/actions";
import { useNotification } from "@/lib/NotificationContext";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, ShieldCheck, Star } from "lucide-react";
import Image from "next/image";

interface Plan {
  id: string;
  unit_amount: number;
  interval: string;
  currency: string;
  active: boolean;
  product_name: string;
  product_description: string | null;
}

const PERKS = [
  "7 dias gratuitos para testar",
  "Simulacoes ilimitadas com IA",
  "Cancele quando quiser",
  "Suporte via WhatsApp",
];

export default function PlanosPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [userData, setUserData] = useState<{
    email: string; nome_completo: string; cpf: string; telefone: string;
    address: string; city: string; postal_code: string; state: string;
    id: string; referral_code: string; company_id: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      const userRes = await getPlanosUserDataAction();
      if (userRes.error || !userRes.data) {
        router.push("/login");
        return;
      }
      
      setUserData(userRes.data as any);

      const plansRes = await getPlansAction();
      if (plansRes.plans && plansRes.plans.length > 0) {
        setPlans(plansRes.plans);
        setSelectedId(plansRes.plans[0].id);
      }
      setLoadingPlans(false);
    }
    loadData();
  }, [router]);

  const isAnnual = (p: Plan) => p.interval === "year";

  const formatCurrency = (amount: number) =>
    (amount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleCheckout = async (planId: string) => {
    if (!userData) return;
    setSelectedId(planId);
    setCheckoutLoading(true);
    try {
      const return_url = `${window.location.origin}/perfil`;
      const res = await createCheckoutSessionAction({
        price_id: planId,
        email: userData.email,
        company_id: userData.company_id,
        return_url,
        name: userData.nome_completo,
        cpf: userData.cpf,
        address: {
          line1: userData.address || "",
          city: userData.city || "",
          postal_code: userData.postal_code || "",
          state: userData.state || "",
        },
        phone: userData.telefone,
        referral_code: userData.referral_code,
      });

      if (res.error) {
        throw new Error(res.error);
      }
      if (res.url) {
        window.location.href = res.url;
      } else {
        throw new Error("URL de checkout não retornada.");
      }
    } catch (err: unknown) {
      notify("Erro", err instanceof Error ? err.message : "Tente novamente.", "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loadingPlans) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#eef2f7]">
        <Loader2 className="animate-spin text-[#1a5fb4]" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#dce8f8] to-[#eef2f7] flex flex-col items-center pt-8 pb-16 px-4 font-sans">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-8">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo.png"
            alt="DentixIA"
            width={150}
            height={38}
            className="h-9 w-auto object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-[#1a2a4a] text-center mb-2">
          Escolha o plano ideal
        </h1>
        <p className="text-gray-500 text-center text-sm max-w-xs">
          Assinatura segura via Stripe. Cancele quando quiser.
        </p>
      </motion.div>




      {/* Grid de Planos */}
      <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
        {plans.map((plan, i) => {
          const annual = isAnnual(plan);
          const monthlyEq = annual ? plan.unit_amount / 12 : plan.unit_amount;
          const selected = selectedId === plan.id;
          const isLoadingThis = checkoutLoading && selected;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.1 } }}
              className="relative flex flex-col h-full"
            >
              {/* Badge 2 meses gratis - SOMENTE plano anual */}
              {annual && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#1a2a4a] text-white text-[10px] sm:text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-xl whitespace-nowrap tracking-widest ring-4 ring-[#dce8f8]">
                  <Sparkles size={12} className="text-yellow-400" />
                  2 MESES GRATIS
                </div>
              )}

              <div
                onClick={() => setSelectedId(plan.id)}
                className={`group flex flex-col h-full bg-white rounded-2xl transition-all duration-300 cursor-pointer ring-offset-2 ring-offset-[#eef2f7] ${
                  selected
                    ? "ring-4 ring-[#1a5fb4] shadow-2xl scale-[1.02] z-10"
                    : "hover:scale-[1.01] hover:shadow-lg border border-gray-100"
                }`}
              >
                <div className="flex flex-col h-full p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <p className={`font-semibold text-base mb-1 ${selected ? "text-[#1a2a4a]" : "text-gray-700"}`}>
                        {plan.product_name}
                      </p>
                      {annual && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full capitalize">
                          POPULAR
                        </div>
                      )}
                    </div>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      selected ? "border-[#1a5fb4] bg-white shadow-inner" : "border-gray-200 bg-gray-50"
                    }`}>
                      <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                        selected ? "bg-[#1a5fb4] scale-100" : "bg-transparent scale-0"
                      }`} />
                    </div>
                  </div>

                  {/* Preco */}
                  <div className="mb-6 flex flex-col justify-center min-h-[60px]">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-semibold tracking-tighter transition-colors ${selected ? "text-[#1a2a4a]" : "text-gray-400"}`}>
                        {formatCurrency(monthlyEq)}
                      </span>
                      <span className="text-gray-400 text-sm font-bold">/mes</span>
                    </div>
                    {annual && (
                      <p className="text-gray-400 text-[13px] font-semibold mt-1">
                        Pago anualmente: <span className="text-[#1a5fb4]">{formatCurrency(plan.unit_amount)}</span>
                      </p>
                    )}
                  </div>

                  {/* Perks */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {PERKS.map((perk, j) => (
                      <li key={j} className="flex items-center gap-3 text-[13px] font-medium text-gray-600">
                        <CheckCircle2 size={16} strokeWidth={2.5} className={selected ? "text-emerald-500" : "text-gray-300"} />
                        {perk}
                      </li>
                    ))}
                    {annual && (
                      <li className="flex items-center gap-3 text-[13px] font-bold text-[#1a5fb4]">
                        <Star size={16} fill="currentColor" className="text-[#1a5fb4]" />
                        Economia real de 16%
                      </li>
                    )}
                  </ul>

                  {/* CTA Button */}
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); handleCheckout(plan.id); }}
                    disabled={checkoutLoading}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-3.5 rounded-2xl font-bold text-base shadow-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                      selected
                        ? "bg-[#1a5fb4] text-white hover:bg-[#174fa0] shadow-blue-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 border border-gray-200 shadow-none"
                    } disabled:opacity-70 disabled:cursor-wait`}
                  >
                    {isLoadingThis ? (
                      <><Loader2 size={20} className="animate-spin" /><span>PREPARANDO...</span></>
                    ) : (
                      <span>CONCLUIR ASSINATURA</span>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.5 } }}
        className="mt-12 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs sm:text-sm capitalize tracking-widest">
          <ShieldCheck size={18} className="text-emerald-500" />
          <span>Checkout Protegido por Stripe</span>
        </div>
        <p className="text-center text-gray-400 text-[11px] max-w-[280px] leading-relaxed">
          *Cancele antes do termino do periodo gratuito sem qualquer cobranca.
        </p>
      </motion.div>
    </div>
  );
}