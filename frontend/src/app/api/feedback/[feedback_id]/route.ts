// src/app/api/feedback/[feedback_id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import getDbPool from "@/lib/db";
import { Feedback } from "@/types/types";

// Get a specific feedback by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { feedback_id: string } }
) {
  const { feedback_id } = params;

  if (isNaN(parseInt(feedback_id, 10))) {
    return NextResponse.json(
      { detail: "Invalid feedback ID" },
      { status: 400 }
    );
  }

  const pool = getDbPool();
  try {
    const query = `
      SELECT id, document, section, feedback, translated_feedback, 
             summary, sentiment, keywords, created_at
      FROM feedback 
      WHERE id = $1
    `;
    const result = await pool.query(query, [feedback_id]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { detail: "Feedback not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching feedback by ID:", error);
    return NextResponse.json(
      { detail: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

// Update feedback
export async function PATCH(
  request: NextRequest,
  { params }: { params: { feedback_id: string } }
) {
  const { feedback_id } = params;
  if (isNaN(parseInt(feedback_id, 10))) {
    return NextResponse.json(
      { detail: "Invalid feedback ID" },
      { status: 400 }
    );
  }

  const updates: Partial<Pick<Feedback, "summary" | "sentiment">> =
    await request.json();

  if (
    !updates ||
    (updates.summary === undefined && updates.sentiment === undefined)
  ) {
    return NextResponse.json(
      { detail: "No updates provided" },
      { status: 400 }
    );
  }

  const pool = getDbPool();
  try {
    const updateParts: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 1;

    if (updates.summary !== undefined) {
      updateParts.push(`summary = $${paramCount++}`);
      queryParams.push(updates.summary);
    }
    if (updates.sentiment !== undefined) {
      updateParts.push(`sentiment = $${paramCount++}`);
      queryParams.push(updates.sentiment);
    }

    queryParams.push(feedback_id);

    const updateQuery = `
      UPDATE feedback 
      SET ${updateParts.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, queryParams);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { detail: "Feedback not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Feedback updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json(
      { detail: "Failed to update feedback" },
      { status: 500 }
    );
  }
}
