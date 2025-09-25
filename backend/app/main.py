from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from contextlib import asynccontextmanager
from feedback_service import feedback_service

class TextItem(BaseModel):
    chapter: str
    section: str
    feedback: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application startup and shutdown events."""
    # Startup
    await feedback_service.initialize_database()
    yield
    # Shutdown
    if feedback_service.db_pool:
        await feedback_service.db_pool.close()

app = FastAPI(lifespan=lifespan)

@app.post("/", status_code=status.HTTP_201_CREATED)
async def process_feedback(item: TextItem):
    """
    Receives feedback, processes it, and stores it in the database.
    Returns a 201 status code on success.
    """
    success = await feedback_service.process_and_store_feedback(item)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process and store feedback."
        )

    return {"message": "Feedback processed and stored successfully."}