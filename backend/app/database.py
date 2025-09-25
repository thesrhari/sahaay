import asyncpg
import os
from typing import Dict, List, Union

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:admin@localhost:5432/database")

async def connect_to_db():
    """Establishes a connection pool to the PostgreSQL database."""
    return await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=10,
        max_queries=50000,
        max_inactive_connection_lifetime=300.0,
        command_timeout=60,
        server_settings={
            'application_name': 'feedback_service',
            'jit': 'off'
        }
    )

async def create_feedback_table(pool):
    """Creates the feedback table if it does not already exist."""
    async with pool.acquire() as connection:
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                chapter TEXT NOT NULL,
                section TEXT NOT NULL,
                feedback TEXT NOT NULL,
                translated_feedback TEXT,
                summary TEXT,
                sentiment VARCHAR(10) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
                keywords TEXT[],
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better performance
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_feedback_chapter_section 
            ON feedback(chapter, section)
        """)
        
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_feedback_sentiment 
            ON feedback(sentiment)
        """)
        
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_feedback_keywords 
            ON feedback USING GIN(keywords)
        """)

async def insert_feedback(pool, data: Dict[str, Union[str, List[str]]]):
    """Inserts the processed feedback data into the database."""
    async with pool.acquire() as connection:
        async with connection.transaction():
            await connection.execute("""
                INSERT INTO feedback (
                    chapter, section, feedback, translated_feedback, 
                    summary, sentiment, keywords
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            data["chapter"],
            data["section"],
            data["feedback"],
            data["translated_feedback"],
            data["summary"],
            data["sentiment"],
            data["keywords"]
            )