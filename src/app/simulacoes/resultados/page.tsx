import { getSimulationsAction, type Simulacao } from "@/lib/simulacoes/queries";
import { SimulationGallery } from "@/components/simulacoes/SimulationGallery";

// Força renderização dinâmica para sempre trazer dados atualizados do banco
export const dynamic = "force-dynamic";

export default async function ResultadosPage() {
  let initialSimulations: Simulacao[] = [];
  try {
    initialSimulations = await getSimulationsAction();
  } catch (error) {
    console.error("Erro ao carregar simulações:", error);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-secondary-bg">
      <main className="max-w-7xl mx-auto w-full px-3 py-4 md:pt-20">
        <SimulationGallery initialSimulations={initialSimulations} />
      </main>
    </div>
  );
}
