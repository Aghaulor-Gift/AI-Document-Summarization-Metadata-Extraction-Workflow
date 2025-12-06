export interface SummaryResult {
  summary: string;
  title: string;
  keywords: string[];
  language: string;
  domain: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}
