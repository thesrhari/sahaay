from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from contextlib import asynccontextmanager
from feedback_service import feedback_service
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware


class TextItem(BaseModel):
    document: str
    # Section is now always a string, either the title or "null".
    section: str
    feedback: str

class SubmissionData(BaseModel):
    documentId: str
    documentTitle: str
    submissionId: str
    submissionTimestamp: str
    totalComments: int
    comments: List[Dict[str, Any]]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await feedback_service.initialize_database()
    yield
    # Shutdown
    if feedback_service.db_pool:
        await feedback_service.db_pool.close()

app = FastAPI(lifespan=lifespan)

origins = ["*"] # For development

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def process_all_comments(comments: List[Dict[str, Any]]):
    """
    Iterates through all submitted comments and processes them individually.
    """
    for comment in comments:
        feedback_text = comment.get('text', '')
        if not feedback_text:
            continue # Skip empty comments

        # --- THIS IS THE KEY CHANGE ---
        # Get the section title from the incoming comment data.
        section_value = comment.get('clauseTitle') # This will be a string or None

        # If the section value is None, convert it to the string "null".
        # Otherwise, use the actual section title.
        if section_value is None:
            section_text = "null"
        else:
            section_text = section_value
        # ----------------------------

        item = TextItem(
            document=comment['documentName'],
            section=section_text, # Pass the transformed value
            feedback=feedback_text
        )
        await feedback_service.process_and_store_feedback(item)


@app.post("/submit-feedback/", status_code=status.HTTP_202_ACCEPTED)
async def submit_feedback(submission: SubmissionData, background_tasks: BackgroundTasks):
    """
    Accepts feedback submission, adds the processing to background tasks,
    and returns an immediate response.
    """
    background_tasks.add_task(process_all_comments, submission.comments)
    return {"message": "Feedback submission received and is being processed."}


@app.post("/", status_code=status.HTTP_201_CREATED)
async def process_feedback(item: TextItem):
    success = await feedback_service.process_and_store_feedback(item)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process and store feedback."
        )

    return {"message": "Feedback processed and stored successfully."}