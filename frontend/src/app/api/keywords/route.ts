// src/app/api/keywords/route.ts
import { NextRequest, NextResponse } from "next/server";
import getDbPool, { buildWhereClause } from "@/lib/db";

const countItems = (arr: string[]) =>
  arr.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const document = searchParams.get("document") || "";
  const section = searchParams.get("section") || "";
  const sentiment = searchParams.get("sentiment") || "";
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const filters = { document, section, sentiment };
  const { clause, params } = buildWhereClause(filters);
  const pool = getDbPool();

  try {
    const query = `
        SELECT UNNEST(keywords) as keyword
        FROM feedback
        ${
          clause ? `${clause} AND` : "WHERE"
        } keywords IS NOT NULL AND array_length(keywords, 1) > 0
    `;
    const result = await pool.query(query, params);
    const allKeywords = result.rows.map((r) => r.keyword).filter(Boolean);

    const keywordCounts = countItems(allKeywords);
    const topKeywords = Object.fromEntries(
      Object.entries(keywordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
    );

    return NextResponse.json(topKeywords);
  } catch (error) {
    console.error("Error fetching keywords:", error);
    return NextResponse.json(
      { detail: "Failed to fetch keywords" },
      { status: 500 }
    );
  }
}
