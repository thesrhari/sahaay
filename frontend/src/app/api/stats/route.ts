// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import getDbPool from "@/lib/db";

export async function GET() {
  const pool = getDbPool();
  try {
    const statsQuery = `
        SELECT 
            COUNT(*) as total_feedback,
            COUNT(DISTINCT document) as total_documents,
            COUNT(DISTINCT section) as total_sections,
            COUNT(CASE WHEN translated_feedback IS NOT NULL THEN 1 END) as translated_count,
            AVG(array_length(keywords, 1)) as avg_keywords_per_feedback
        FROM feedback
    `;
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    const recentQuery = `
        SELECT COUNT(*) as recent_feedback
        FROM feedback 
        WHERE created_at > NOW() - INTERVAL '7 days'
    `;
    const recentResult = await pool.query(recentQuery);
    const recent = recentResult.rows[0].recent_feedback;

    return NextResponse.json({
      total_feedback: parseInt(stats.total_feedback, 10),
      total_documents: parseInt(stats.total_documents, 10),
      total_sections: parseInt(stats.total_sections, 10),
      translated_feedback_count: parseInt(stats.translated_count, 10),
      avg_keywords_per_feedback: parseFloat(
        stats.avg_keywords_per_feedback || 0
      ),
      recent_feedback_7_days: parseInt(recent, 10),
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { detail: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
