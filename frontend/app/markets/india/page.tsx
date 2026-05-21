import { MarketsDashboard } from "@/components/markets-dashboard";
import { IndiaLiveTicker } from "@/components/india-live-ticker";
import { StockEdgeHeader } from "@/components/stock-edge-header";

export default function IndiaMarketsPage() {
  return (
    <>
      <StockEdgeHeader />
      <div className="app-grid-bg min-h-dvh pb-14">
        <MarketsDashboard region="india" />
      </div>
      <IndiaLiveTicker />
    </>
  );
}
