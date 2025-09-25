// src/app/api/documents/route.ts
import { NextResponse } from "next/server";
import getDbPool from "@/lib/db";

export async function GET() {
  const pool = getDbPool();
  try {
    const query = `
      SELECT DISTINCT document as id, document as name, MIN(created_at) as created_at
      FROM feedback 
      GROUP BY document 
      ORDER BY MIN(created_at) DESC
    `;
    const result = await pool.query(query);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { detail: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
