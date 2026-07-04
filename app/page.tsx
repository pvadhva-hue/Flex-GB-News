import BriefDashboard from "@/components/BriefDashboard";
import { getRevenueSeries, getStories } from "@/lib/store";

interface HomeProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const [{ tab }, stories, revenueSeries] = await Promise.all([
    searchParams,
    getStories(),
    getRevenueSeries(),
  ]);

  return <BriefDashboard stories={stories} revenueSeries={revenueSeries} activeTab={tab} />;
}
