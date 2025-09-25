from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from contextlib import asynccontextmanager
from feedback_service import feedback_service

class TextItem(BaseModel):
    document: str
    section: str
    feedback: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await feedback_service.initialize_database()
    yield
    # Shutdown
    if feedback_service.db_pool:
        await feedback_service.db_pool.close()

app = FastAPI(lifespan=lifespan)

@app.post("/", status_code=status.HTTP_201_CREATED)
async def process_feedback(item: TextItem):
    success = await feedback_service.process_and_store_feedback(item)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process and store feedback."
        )

    return {"message": "Feedback processed and stored successfully."}