import { AnalysisAgent } from "@/components/analysis-agent";
import { IndiaLiveTicker } from "@/components/india-live-ticker";
import { MarketContextSidebar } from "@/components/market-context-sidebar";
import { StockEdgeHeader } from "@/components/stock-edge-header";

export default function HomePage() {
  return (
    <>
      <StockEdgeHeader />
      <div className="app-grid-bg min-h-dvh pb-14">
        <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:gap-10">
          <section>
            <AnalysisAgent />
          </section>
          <section>
            <MarketContextSidebar />
          </section>
        </main>
      </div>
      <IndiaLiveTicker />
    </>
  );
}