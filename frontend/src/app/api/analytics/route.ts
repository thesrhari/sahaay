// src/app/api/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import getDbPool, { buildWhereClause } from "@/lib/db";

// A simple Counter utility
const countItems = (arr: string[]) =>
  arr.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

const determineOverallSentiment = (
  positive: number,
  negative: number,
  neutral: number
): string => {
  const total = positive + negative + neutral;
  if (total === 0) return "Mixed";
  if (positive / total > 0.6) return "Positive";
  if (negative / total > 0.6) return "Negative";
  return "Mixed";
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const document = searchParams.get("document") || "";
  const section = searchParams.get("section") || "";
  const sentiment = searchParams.get("sentiment") || "";

  const filters = { document, section, sentiment };
  const { clause, params } = buildWhereClause(filters);

  const pool = getDbPool();
  try {
    // Sentiment counts
    const sentimentQuery = `
      SELECT sentiment, COUNT(*) as count
      FROM feedback
      ${clause ? `${clause} AND` : "WHERE"} sentiment IS NOT NULL
      GROUP BY sentiment
    `;
    const sentimentResult = await pool.query(sentimentQuery, params);
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    sentimentResult.rows.forEach((row) => {
      if (sentimentCounts.hasOwnProperty(row.sentiment)) {
        sentimentCounts[row.sentiment as "positive" | "negative" | "neutral"] =
          parseInt(row.count, 10);
      }
    });

    // Total feedback count
    const totalQuery = `SELECT COUNT(*) FROM feedback ${clause}`;
    const totalResult = await pool.query(totalQuery, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    // Keywords
    const keywordsQuery = `
        SELECT UNNEST(keywords) as keyword
        FROM feedback
        ${
          clause ? `${clause} AND` : "WHERE"
        } keywords IS NOT NULL AND array_length(keywords, 1) > 0
    `;
    const keywordsResult = await pool.query(keywordsQuery, params);
    const allKeywords = keywordsResult.rows
      .map((r) => r.keyword)
      .filter(Boolean);
    const keywordCounts = countItems(allKeywords);
    const topKeywords = Object.fromEntries(
      Object.entries(keywordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
    );

    const overallSentiment = determineOverallSentiment(
      sentimentCounts.positive,
      sentimentCounts.negative,
      sentimentCounts.neutral
    );

    return NextResponse.json({
      total,
      positive: sentimentCounts.positive,
      negative: sentimentCounts.negative,
      neutral: sentimentCounts.neutral,
      overallSentiment,
      keywords: topKeywords,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { detail: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
