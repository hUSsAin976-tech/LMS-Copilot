"""
LLM Service for Rahnuma AI supporting Google Gemini and Groq Cloud.
Provides resilient generation, structured JSON extraction, and embeddings
with automatic high-speed fallback between Groq and Gemini.
"""
import os
import json
import logging
import re
from typing import Optional, Dict, Any, List
import urllib.request
import urllib.error

from app.core.config import settings

logger = logging.getLogger(__name__)

# Try importing google.generativeai
try:
    import google.generativeai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None
    _GENAI_AVAILABLE = False


class LLMService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.primary_model = settings.PRIMARY_GEMINI_MODEL or "gemini-3.8-flash"
        self.fast_model = settings.FAST_GEMINI_MODEL or "gemini-3.8-flash"
        self.configured = False

        self.groq_api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
        self.groq_model = settings.PRIMARY_GROQ_MODEL or "qwen/qwen3.8-27b"
        self.groq_configured = bool(self.groq_api_key)

        self._initialize()

    def _initialize(self):
        if _GENAI_AVAILABLE and self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.configured = True
                logger.info(f"Gemini LLM service initialized successfully ({self.primary_model}).")
            except Exception as e:
                logger.warning(f"Failed to configure google.generativeai: {e}")
                self.configured = False
        else:
            self.configured = False

        if self.groq_api_key:
            self.groq_configured = True
            logger.info(f"Groq LLM service initialized successfully ({self.groq_model}).")

    def configure_key(self, api_key: str) -> bool:
        """Sets new Gemini API key at runtime."""
        self.api_key = api_key.strip()
        if not self.api_key:
            self.configured = False
            return False
        if _GENAI_AVAILABLE:
            try:
                genai.configure(api_key=self.api_key)
                self.configured = True
                return True
            except Exception as e:
                logger.error(f"Error configuring Gemini with new key: {e}")
                self.configured = False
                return False
        return False

    def configure_groq_key(self, api_key: str) -> bool:
        """Sets new Groq API key at runtime."""
        self.groq_api_key = api_key.strip()
        self.groq_configured = bool(self.groq_api_key)
        return self.groq_configured

    @property
    def is_available(self) -> bool:
        return self.configured or self.groq_configured

    def test_connection(self) -> Dict[str, Any]:
        """Validates current Gemini and Groq API keys."""
        results = {}

        # Test Gemini
        if self.configured and self.api_key:
            try:
                model = genai.GenerativeModel(self.primary_model)
                resp = model.generate_content("Ping. Reply with Pong.")
                if resp and resp.text:
                    results["gemini"] = {"valid": True, "model": self.primary_model, "response": resp.text.strip()}
                else:
                    results["gemini"] = {"valid": False, "message": "Empty response"}
            except Exception as e:
                results["gemini"] = {"valid": False, "error": str(e)}
        else:
            results["gemini"] = {"valid": False, "message": "Gemini key not configured"}

        # Test Groq
        if self.groq_configured and self.groq_api_key:
            groq_test = self._call_groq(
                messages=[{"role": "user", "content": "Ping. Reply with Pong."}],
                max_tokens=20,
            )
            if groq_test:
                results["groq"] = {"valid": True, "model": self.groq_model, "response": groq_test.strip()}
            else:
                results["groq"] = {"valid": False, "message": "Groq call failed"}
        else:
            results["groq"] = {"valid": False, "message": "Groq key not configured"}

        overall_valid = any(v.get("valid") for v in results.values())
        return {
            "valid": overall_valid,
            "message": "Connected to AI providers" if overall_valid else "No AI provider connected",
            "details": results,
        }

    # ──────────────── Groq Direct Request Helper ────────────────
    def _call_groq(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.4,
        json_mode: bool = False,
        max_tokens: int = 1500,
    ) -> Optional[str]:
        if not self.groq_api_key:
            return None

        url = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": self.groq_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json",
                "User-Agent": "RahnumaAI/2.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                result_json = json.loads(resp.read().decode("utf-8"))
                return result_json["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            return None

    # ──────────────── Text Generation (Gemini with Groq fallback) ────────────────
    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model_name: Optional[str] = None,
        temperature: float = 0.5,
    ) -> Optional[str]:
        """Generates plain text response using Gemini, falling back to Groq."""
        # 1. Try Gemini
        if self.configured and self.api_key:
            model_id = model_name or self.primary_model
            try:
                model = genai.GenerativeModel(
                    model_name=model_id,
                    system_instruction=system_instruction,
                    generation_config=genai.types.GenerationConfig(temperature=temperature),
                )
                response = model.generate_content(prompt)
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini generate_text failed, trying Groq fallback: {e}")

        # 2. Try Groq
        if self.groq_configured:
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            resp = self._call_groq(messages=messages, temperature=temperature)
            if resp:
                return resp.strip()

        return None

    # ──────────────── JSON Generation ────────────────
    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generates structured JSON output using Gemini or Groq."""
        full_system = (system_instruction or "") + "\nOutput MUST be valid JSON only, without any markdown formatting or text outside the JSON."

        # 1. Try Gemini
        if self.configured and self.api_key:
            model_id = model_name or self.primary_model
            try:
                model = genai.GenerativeModel(
                    model_name=model_id,
                    system_instruction=full_system,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                    ),
                )
                response = model.generate_content(prompt)
                if response and response.text:
                    clean_text = response.text.strip()
                    clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text)
                    clean_text = re.sub(r"\s*```$", "", clean_text)
                    return json.loads(clean_text)
            except Exception as e:
                logger.warning(f"Gemini generate_json failed, trying Groq: {e}")

        # 2. Try Groq
        if self.groq_configured:
            messages = [
                {"role": "system", "content": full_system},
                {"role": "user", "content": prompt},
            ]
            resp_text = self._call_groq(messages=messages, temperature=0.1, json_mode=True)
            if resp_text:
                try:
                    clean_text = resp_text.strip()
                    clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text)
                    clean_text = re.sub(r"\s*```$", "", clean_text)
                    return json.loads(clean_text)
                except Exception as e:
                    logger.error(f"Failed to parse Groq JSON response: {e}")

        return None

    # ──────────────── Embeddings ────────────────
    def get_embedding(self, text: str, model: str = "models/gemini-embedding-001") -> Optional[List[float]]:
        """Generates dense vector embedding using Gemini embedding API."""
        if not self.configured or not self.api_key:
            return None

        try:
            result = genai.embed_content(
                model=model,
                content=text,
                task_type="retrieval_document",
            )
            if result and "embedding" in result:
                return result["embedding"]
            return None
        except Exception as e:
            logger.error(f"Error generating embedding with {model}: {e}")
            return None


# Global singleton instance
llm_service = LLMService()
