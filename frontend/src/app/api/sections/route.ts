// src/app/api/sections/route.ts
import { NextRequest, NextResponse } from "next/server";
import getDbPool from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const document = searchParams.get("document");

  if (!document) {
    return NextResponse.json(
      { detail: "Document parameter is required" },
      { status: 400 }
    );
  }

  const pool = getDbPool();
  try {
    const query = `
      SELECT DISTINCT section as id, section as name, document
      FROM feedback 
      WHERE document = $1
      ORDER BY section
    `;
    const result = await pool.query(query, [document]);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json(
      { detail: "Failed to fetch sections" },
      { status: 500 }
    );
  }
}
