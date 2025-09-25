// types.ts

export interface Feedback {
  id: string;
  feedback: string;
  translatedFeedback?: string;
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  section: string;
  document: string;
  keywords: string[];
}

export interface Document {
  id: string;
  name: string;
}

export interface Section {
  id: string;
  name: string;
}

export interface Analytics {
  total: number;
  overallSentiment: string;
  positive: number;
  negative: number;
  neutral: number;
  keywords: Record<string, number>;
}

export interface SentimentData {
  name: string;
  value: number;
  color: string;
  // This index signature makes the type compatible with recharts
  [key: string]: any;
}

export interface KeywordData {
  keyword: string;
  count: number;
  // This index signature makes the type compatible with recharts
  [key: string]: any;
}
