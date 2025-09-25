// src/lib/db.ts
import { Pool } from "pg";

let pool: Pool;

function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

export default getDbPool;

// Helper to build dynamic WHERE clauses safely
export function buildWhereClause(filters: Record<string, any>): {
  clause: string;
  params: any[];
} {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 1;

  const filterMap: Record<string, string> = {
    document: "document",
    section: "section",
    sentiment: "sentiment",
  };

  for (const key in filters) {
    if (filters[key] && filterMap[key]) {
      conditions.push(`${filterMap[key]} = $${paramCount++}`);
      params.push(filters[key]);
    }
  }

  const clause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, params };
}
