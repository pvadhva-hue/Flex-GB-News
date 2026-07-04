import type { AnalysedStory, RevenueDataPoint, StoryCategory } from "@/lib/types";
import StoryCard from "./StoryCard";
import RevenueChart from "./RevenueChart";

const TABS: { key: StoryCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "transaction", label: "Transactions" },
  { key: "offtake", label: "Offtake" },
  { key: "policy", label: "Policy" },
  { key: "market", label: "Market" },
  { key: "technology", label: "Technology" },
];

interface BriefDashboardProps {
  stories: AnalysedStory[];
  revenueSeries: RevenueDataPoint[];
  activeTab?: string;
}

export default function BriefDashboard({
  stories,
  revenueSeries,
  activeTab = "all",
}: BriefDashboardProps) {
  const filtered =
    activeTab === "all" ? stories : stories.filter((story) => story.category === activeTab);

  return (
    <main className="min-h-screen bg-[#0a0c10] text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-[#00e5c8] sm:text-3xl">
            BESS Intelligence Brief
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            GB &amp; European battery storage transactions, offtake, and market intelligence.
          </p>
        </header>

        <RevenueChart data={revenueSeries} />

        <nav className="mt-8 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            const href = tab.key === "all" ? "/" : `/?tab=${tab.key}`;
            return (
              <a
                key={tab.key}
                href={href}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  isActive
                    ? "bg-[#00e5c8] font-medium text-[#0a0c10]"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </nav>

        <section className="mt-6 flex flex-col gap-4">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No stories yet. Run the brief pipeline to populate this dashboard.
            </p>
          ) : (
            filtered.map((story) => <StoryCard key={story.hash} story={story} />)
          )}
        </section>
      </div>
    </main>
  );
}
