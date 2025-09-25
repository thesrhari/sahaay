// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import getDbPool, { buildWhereClause } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const document = searchParams.get("document") || "";
  const section = searchParams.get("section") || "";
  const sentiment = searchParams.get("sentiment") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const filters = { document, section, sentiment };
  const { clause, params } = buildWhereClause(filters);

  const pool = getDbPool();
  try {
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM feedback ${clause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT id, document, section, feedback, translated_feedback, 
             summary, sentiment, keywords, created_at
      FROM feedback
      ${clause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataResult = await pool.query(dataQuery, [...params, limit, offset]);

    return NextResponse.json({
      data: dataResult.rows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { detail: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
