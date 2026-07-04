import type { FeedSource } from "./types";

export const PRIMARY_FEEDS: FeedSource[] = [
  { url: "https://www.energy-storage.news/feed", label: "ESS News", weight: 3 },
  { url: "https://modoenergy.com/research/rss", label: "Modo Energy research", weight: 3 },
  { url: "https://www.investegate.co.uk/rss.aspx?company=GRID", label: "Gresham House RNS", weight: 3 },
  { url: "https://www.investegate.co.uk/rss.aspx?company=GSF", label: "Gore Street RNS", weight: 3 },
  { url: "https://deltaee.podbean.com/feed.xml", label: "LCP Delta podcast", weight: 3 },
  { url: "https://feeds.acast.com/public/shows/transmission-by-modo-energy", label: "Modo podcast", weight: 3 },
];

export const SECONDARY_FEEDS: FeedSource[] = [
  { url: "https://www.solarpowerportal.co.uk/feed", label: "Solar Power Portal", weight: 2 },
  { url: "https://www.pv-magazine.com/feed/", label: "PV Magazine", weight: 2 },
  { url: "https://auroraer.com/feed/", label: "Aurora Energy Research", weight: 2 },
  { url: "https://pexapark.com/feed/", label: "Pexapark", weight: 2 },
  { url: "https://www.elgarmiddleton.com/feed/", label: "Elgar Middleton", weight: 2 },
  { url: "https://mnacommunity.com/feed/", label: "M&A Community", weight: 2 },
  { url: "https://aercommercial.podbean.com/feed.xml", label: "AER Commercial podcast", weight: 2 },
];

export const ALL_FEEDS: FeedSource[] = [...PRIMARY_FEEDS, ...SECONDARY_FEEDS];

export const TRACKED_PLAYERS: string[] = [
  "Gresham House",
  "GRID",
  "Zenobē",
  "Field Energy",
  "Statera",
  "Fidra",
  "Gore Street",
  "Harmony Energy",
  "Pulse Clean Energy",
  "Flexitricity",
  "Habitat Energy",
  "InterGen",
  "Eku Energy",
  "Fluence",
  "Wärtsilä",
  "RES Group",
  "SSE",
  "EDF Renewables",
  "Octopus Energy",
  "Penso Power",
];

export const OFFTAKE_KEYWORDS: string[] = [
  "toll",
  "tolling agreement",
  "floor agreement",
  "financial swap",
  "revenue swap",
  "cap and floor",
  "capacity market",
  "route to market",
  "PPA",
  "offtake agreement",
];

export const RELEVANCE_KEYWORDS: string[] = [
  "BESS",
  "battery storage",
  "battery energy storage",
  "grid-scale battery",
  "energy storage",
  ...TRACKED_PLAYERS,
  ...OFFTAKE_KEYWORDS,
];

export const PRIORITY_TOPICS: string[] = [
  "long duration energy storage (LDES) cap and floor scheme",
  "repetitive re-trading in the GB Balancing Mechanism",
  "grid connection queue reform (e.g. TMO4+, connections reform, queue management)",
];

export const RELEVANCE_THRESHOLD = 7;
export const HIGH_RELEVANCE_THRESHOLD = 8;
export const ANALYSER_BATCH_SIZE = 8;
export const CLAUDE_MODEL = "claude-sonnet-4-6";
