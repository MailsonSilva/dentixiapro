import { getSimulationsAction } from "@/lib/simulacoes/queries";
import { SimulationGallery } from "@/components/simulacoes/SimulationGallery";

// Força renderização dinâmica para sempre trazer dados atualizados do banco
export const dynamic = "force-dynamic";

export default async function ResultadosPage() {
  let initialSimulations = [];
  try {
    initialSimulations = await getSimulationsAction();
  } catch (error) {
    console.error("Erro ao carregar simulações:", error);
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 md:pb-0 md:pt-20 bg-secondary-bg">
      <main className="max-w-7xl mx-auto w-full px-6 py-8">
        <SimulationGallery initialSimulations={initialSimulations} />
      </main>
    </div>
  );
}
