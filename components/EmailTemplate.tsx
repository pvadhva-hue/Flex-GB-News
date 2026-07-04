import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { AnalysedStory } from "@/lib/types";

const CATEGORY_LABELS: Record<AnalysedStory["category"], string> = {
  transaction: "Transaction",
  offtake: "Offtake",
  policy: "Policy",
  market: "Market",
  technology: "Technology",
  other: "Other",
};

const bodyStyle = { backgroundColor: "#f4f4f5", fontFamily: "Arial, Helvetica, sans-serif", padding: "24px 0" };
const containerStyle = { backgroundColor: "#ffffff", borderRadius: "8px", margin: "0 auto", maxWidth: "600px", padding: "32px" };
const headingStyle = { color: "#0a0c10", fontSize: "22px", fontWeight: 700, margin: "0 0 4px" };
const subheadingStyle = { color: "#52525b", fontSize: "14px", margin: "0 0 24px" };
const storyTitleStyle = { color: "#0a0c10", fontSize: "16px", fontWeight: 600, margin: "0 0 4px" };
const storyMetaStyle = { color: "#71717a", fontSize: "12px", margin: "0 0 8px", textTransform: "uppercase" as const, letterSpacing: "0.03em" };
const storySummaryStyle = { color: "#3f3f46", fontSize: "14px", lineHeight: "20px", margin: "0 0 8px" };
const storyLinkStyle = { color: "#0f9a87", fontSize: "13px", fontWeight: 600 };
const auroraRelevanceBoxStyle = {
  backgroundColor: "#ecfdf9",
  border: "1px solid #99f0e2",
  borderRadius: "6px",
  margin: "8px 0",
  padding: "10px 14px",
};
const auroraRelevanceLabelStyle = {
  color: "#0f9a87",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.03em",
  margin: "0 0 2px",
  textTransform: "uppercase" as const,
};
const auroraRelevanceTextStyle = { color: "#134e4a", fontSize: "13px", lineHeight: "18px", margin: 0 };
const footerStyle = { color: "#a1a1aa", fontSize: "12px", margin: "24px 0 0" };

interface EmailTemplateProps {
  stories: AnalysedStory[];
  weekday: string;
  date: string;
}

export default function EmailTemplate({ stories, weekday, date }: EmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${stories.length} new BESS stories: ${stories[0]?.title ?? ""}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>BESS Intelligence Brief</Heading>
          <Text style={subheadingStyle}>
            {weekday} {date} · {stories.length} new {stories.length === 1 ? "story" : "stories"}
          </Text>

          {stories.map((story, index) => (
            <Section key={story.hash}>
              <Text style={storyMetaStyle}>
                {CATEGORY_LABELS[story.category]} · {story.source} · score {story.score}/10
              </Text>
              <Text style={storyTitleStyle}>{story.title}</Text>
              <Text style={storySummaryStyle}>{story.summary}</Text>
              {story.auroraRelevance && (
                <Section style={auroraRelevanceBoxStyle}>
                  <Text style={auroraRelevanceLabelStyle}>Why this matters to Aurora</Text>
                  <Text style={auroraRelevanceTextStyle}>{story.auroraRelevance}</Text>
                </Section>
              )}
              <Link href={story.link} style={storyLinkStyle}>
                Read full story →
              </Link>
              {index < stories.length - 1 && <Hr style={{ borderColor: "#e4e4e7", margin: "20px 0" }} />}
            </Section>
          ))}

          <Text style={footerStyle}>
            BESS Intelligence Brief — GB &amp; European battery storage transaction and market
            intelligence.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
