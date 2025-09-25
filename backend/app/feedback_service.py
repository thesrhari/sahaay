from transformers import AutoModelForCausalLM, AutoTokenizer
import asyncio
from typing import List, Optional
from database import insert_feedback, create_feedback_table, connect_to_db
import torch

class FeedbackService:
    def __init__(self):
        model_name = "Qwen/Qwen2.5-3B-Instruct"
        
        # Determine best available device
        if torch.cuda.is_available():
            self.device = "cuda"
        elif torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"
            
        # Optimize model loading
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            dtype=torch.float16 if self.device == "cuda" else torch.float32,
            device_map="auto" if self.device == "cuda" else None,
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )
        
        if self.device != "cuda":
            self.model.to(self.device)
            
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name, 
            trust_remote_code=True
        )
        
        # Set pad token if it doesn't exist
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            
        self.db_pool = None
        self.executor = None

    async def initialize_database(self):
        self.db_pool = await connect_to_db()
        await create_feedback_table(self.db_pool)
        
        # Initialize thread pool executor
        from concurrent.futures import ThreadPoolExecutor
        self.executor = ThreadPoolExecutor(max_workers=2)

    def _generate(self, prompt: str) -> str:
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]

        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )

        model_inputs = self.tokenizer(
            text, 
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=2048
        ).to(self.device)

        with torch.no_grad():
            generated_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=512,
                do_sample=True,
                temperature=0.1,
                top_p=0.9,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                early_stopping=True
            )

        # Extract only the generated tokens
        generated_ids = generated_ids[:, model_inputs.input_ids.shape[1]:]
        response = self.tokenizer.decode(generated_ids[0], skip_special_tokens=True)
        return response.strip()

    async def summarize(self, text: str) -> str:
        prompt = f"Generate a short, concise summary in English. Summarize in as few words as possible while preserving all important keywords, facts, and meaning exactly as in the original text. Return only the summary:\n\n{text}"
        return await asyncio.get_event_loop().run_in_executor(
            self.executor, self._generate, prompt
        )

    async def analyze_sentiment(self, text: str) -> str:
        prompt = f"Analyze the sentiment of this feedback. Respond with only one word: positive, negative, or neutral.\n\nFeedback: {text}"
        response = await asyncio.get_event_loop().run_in_executor(
            self.executor, self._generate, prompt
        )
        
        response_lower = response.lower().strip()
        if any(word in response_lower for word in ["positive", "good", "excellent", "great"]):
            return "positive"
        elif any(word in response_lower for word in ["negative", "bad", "poor", "terrible"]):
            return "negative"
        else:
            return "neutral"

    async def detect_language_is_english(self, text: str) -> bool:
        prompt = f"Is the following text primarily in English? This includes mixed languages like Hinglish. Answer only 'yes' or 'no':\n\n{text}"
        response = await asyncio.get_event_loop().run_in_executor(
            self.executor, self._generate, prompt
        )
        return "yes" in response.lower()

    async def translate_to_english(self, text: str) -> str:
        prompt = f"Translate this text to English. Return only the translation:\n\n{text}"
        return await asyncio.get_event_loop().run_in_executor(
            self.executor, self._generate, prompt
        )

    async def extract_keywords(self, text: str) -> List[str]:
        prompt = f"Extract the 5-10 most important keywords from this text. Each keyword should be a single word. Return them as a comma-separated list with no other text:\n\n{text}"
        response = await asyncio.get_event_loop().run_in_executor(
            self.executor, self._generate, prompt
        )
        
        # Clean and filter keywords
        keywords = [
            keyword.strip().lower() 
            for keyword in response.split(',') 
            if keyword.strip() and len(keyword.strip()) > 2
        ]
        
        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for keyword in keywords:
            if keyword not in seen:
                seen.add(keyword)
                unique_keywords.append(keyword)
                
        return unique_keywords[:10]

    async def process_and_store_feedback(self, item) -> bool:
        """Processes the feedback and stores it in the database."""
        try:
            is_english = await self.detect_language_is_english(item.feedback)
            
            translated_feedback: Optional[str] = None
            text_to_process = item.feedback
            
            if not is_english:
                translated_feedback = await self.translate_to_english(item.feedback)
                text_to_process = translated_feedback
            
            summary, sentiment, keywords = await asyncio.gather(
                self.summarize(text_to_process),
                self.analyze_sentiment(text_to_process),
                self.extract_keywords(text_to_process),
                return_exceptions=True
            )
            
            # Handle any exceptions
            if isinstance(summary, Exception):
                summary = "Summary generation failed"
            if isinstance(sentiment, Exception):
                sentiment = "neutral"
            if isinstance(keywords, Exception):
                keywords = []
            
            feedback_data = {
                "document": item.document,
                "section": item.section,
                "feedback": item.feedback,
                "translated_feedback": translated_feedback,
                "summary": summary,
                "sentiment": sentiment,
                "keywords": keywords
            }
            
            await insert_feedback(self.db_pool, feedback_data)
            return True
            
        except Exception as e:
            print(f"Error processing feedback: {e}")
            return False

# Global instance
feedback_service = FeedbackService()