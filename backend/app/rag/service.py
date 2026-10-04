"""
RAG Service for Rahnuma AI.
Extracts, chunks, embeds, and indexes course materials for semantic retrieval.
Supports PDF extraction (pypdf), HTML (BeautifulSoup), Markdown, and TXT files.
Uses Gemini dense embeddings when API key is provided, with intelligent semantic n-gram fallback.
Stores in ChromaDB or persistent SQLite vector store.
"""
import os
import io
import math
import json
import sqlite3
import hashlib
import logging
from typing import List, Dict, Any, Optional

from app.services.llm import llm_service

logger = logging.getLogger(__name__)

# Try chromadb
try:
    import chromadb
    _CHROMADB_AVAILABLE = True
except ImportError:
    chromadb = None
    _CHROMADB_AVAILABLE = False

# Try pypdf
try:
    import pypdf
    _PYPDF_AVAILABLE = True
except ImportError:
    pypdf = None
    _PYPDF_AVAILABLE = False

# Try bs4
try:
    from bs4 import BeautifulSoup
    _BS4_AVAILABLE = True
except ImportError:
    BeautifulSoup = None
    _BS4_AVAILABLE = False


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


def _compute_fallback_embedding(text: str, dim: int = 768) -> List[float]:
    """
    Generates a deterministic 768-dim normalized embedding based on word/character n-grams.
    Produces high cosine similarity for semantically overlapping text without requiring external API keys.
    """
    vec = [0.0] * dim
    words = text.lower().split()
    if not words:
        return [0.0] * dim

    for w in words:
        # Hash word into bucket
        h = int(hashlib.md5(w.encode("utf-8", errors="ignore")).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 1.0

        # Sub-word 3-grams for semantic fuzzy overlap
        for i in range(len(w) - 2):
            trigram = w[i:i+3]
            th = int(hashlib.sha256(trigram.encode("utf-8", errors="ignore")).hexdigest(), 16)
            tidx = th % dim
            vec[tidx] += 0.5

    # Normalize vector to unit sphere
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Extracts text from PDF, HTML, Markdown, or text documents."""
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        if _PYPDF_AVAILABLE:
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                pages_text = []
                for idx, page in enumerate(reader.pages):
                    pt = page.extract_text() or ""
                    if pt.strip():
                        pages_text.append(f"[Page {idx + 1}]\n{pt.strip()}")
                return "\n\n".join(pages_text)
            except Exception as e:
                logger.error(f"Failed to parse PDF with pypdf: {e}")
        return "Unable to parse PDF content (parser error or pypdf missing)."

    if ext in [".html", ".htm"]:
        if _BS4_AVAILABLE:
            try:
                soup = BeautifulSoup(file_bytes.decode("utf-8", errors="ignore"), "html.parser")
                # Remove scripts and styles
                for s in soup(["script", "style", "nav", "footer"]):
                    s.decompose()
                return soup.get_text(separator="\n", strip=True)
            except Exception as e:
                logger.error(f"Failed to parse HTML with BeautifulSoup: {e}")

    # Plain text, markdown, csv, json, code
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1", errors="ignore")


class RAGService:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        os.makedirs(self.persist_directory, exist_ok=True)
        self.backend = "sqlite"
        self.chroma_collection = None

        if _CHROMADB_AVAILABLE:
            try:
                self.client = chromadb.PersistentClient(path=self.persist_directory)
                self.chroma_collection = self.client.get_or_create_collection(name="course_materials")
                self.backend = "chromadb"
                logger.info("RAGService: Initialized with ChromaDB backend.")
            except Exception as e:
                logger.warning(f"ChromaDB failed to initialize ({e}). Falling back to SQLite vector store.")
                self.backend = "sqlite"

        if self.backend == "sqlite":
            self._init_sqlite()

    def _init_sqlite(self):
        self.db_path = os.path.join(self.persist_directory, "rag_store.sqlite")
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS material_chunks (
                    id TEXT PRIMARY KEY,
                    material_id TEXT,
                    course_id TEXT,
                    user_id INTEGER,
                    title TEXT,
                    course_code TEXT,
                    chunk_index INTEGER,
                    content TEXT,
                    embedding_json TEXT
                )
            """)
            # Ensure columns exist in case table was created with older schema
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(material_chunks)")
            existing_cols = {row[1] for row in cur.fetchall()}
            if "course_code" not in existing_cols:
                conn.execute("ALTER TABLE material_chunks ADD COLUMN course_code TEXT DEFAULT ''")
            conn.commit()
        logger.info(f"RAGService: Initialized with SQLite vector store at {self.db_path}")

    def _generate_embedding(self, text: str) -> List[float]:
        # 1. Try real Gemini embedding if configured
        if llm_service.is_available:
            emb = llm_service.get_embedding(text)
            if emb:
                return emb

        # 2. High-precision semantic fallback embedding
        return _compute_fallback_embedding(text)

    def chunk_document(self, text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
        """Splits document text into overlapping semantic chunks with sentence awareness."""
        text = text.strip()
        if not text:
            return []

        if len(text) <= chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            if end < len(text):
                boundary = text.rfind("\n\n", start, end)
                if boundary == -1:
                    boundary = text.rfind(". ", start, end)
                if boundary != -1 and boundary > start + chunk_size // 2:
                    end = boundary + 1

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end - overlap

        return chunks

    def ingest_document(
        self,
        material_id: str,
        course_id: str,
        user_id: int,
        title: str,
        text: str,
        course_code: str = ""
    ) -> int:
        """Pipeline: Clean -> Chunk -> Embed -> Store (upsert). Returns count of chunks indexed."""
        if not text or not text.strip():
            text = title

        chunks = self.chunk_document(text)
        if not chunks:
            return 0

        embeddings = []
        metadatas = []
        ids = []
        documents = []

        for i, chunk in enumerate(chunks):
            chunk_id = f"{material_id}_chunk_{i}"
            embedding = self._generate_embedding(chunk)
            embeddings.append(embedding)
            documents.append(chunk)
            ids.append(chunk_id)
            meta = {
                "user_id": user_id,
                "course_id": str(course_id),
                "course_code": course_code,
                "material_id": str(material_id),
                "title": title,
                "chunk_index": i
            }
            metadatas.append(meta)

        if self.backend == "chromadb" and self.chroma_collection:
            try:
                self.chroma_collection.upsert(
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
                logger.info(f"RAGService: Indexed {len(chunks)} chunks in ChromaDB for '{title}'")
                return len(chunks)
            except Exception as e:
                logger.error(f"ChromaDB upsert failed, syncing to SQLite fallback: {e}")

        # SQLite vector store insertion
        with sqlite3.connect(self.db_path) as conn:
            for i, chunk in enumerate(chunks):
                chunk_id = ids[i]
                conn.execute("""
                    INSERT OR REPLACE INTO material_chunks 
                    (id, material_id, course_id, user_id, title, course_code, chunk_index, content, embedding_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    chunk_id,
                    str(material_id),
                    str(course_id),
                    user_id,
                    title,
                    course_code,
                    i,
                    chunk,
                    json.dumps(embeddings[i])
                ))
            conn.commit()

        logger.info(f"RAGService: Indexed {len(chunks)} chunks in SQLite vector store for '{title}'")
        return len(chunks)

    def search(
        self,
        query: str,
        user_id: int,
        course_id: Optional[str] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """Performs vector similarity search across indexed course materials."""
        if not query or not query.strip():
            return []

        query_embedding = self._generate_embedding(query)

        if self.backend == "chromadb" and self.chroma_collection:
            try:
                where_filter = {"user_id": user_id}
                if course_id:
                    where_filter["course_id"] = str(course_id)

                results = self.chroma_collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k,
                    where=where_filter
                )
                formatted_results = []
                if results and results.get("documents"):
                    for idx, doc in enumerate(results["documents"][0]):
                        meta = results["metadatas"][0][idx]
                        dist = results["distances"][0][idx] if "distances" in results else None
                        formatted_results.append({
                            "content": doc,
                            "metadata": meta,
                            "score": round(1.0 - (dist if dist is not None else 0.5), 3)
                        })
                if formatted_results:
                    return formatted_results
            except Exception as e:
                logger.warning(f"ChromaDB search failed, falling back to SQLite search: {e}")

        # SQLite search with cosine similarity
        results = []
        with sqlite3.connect(self.db_path) as conn:
            query_sql = "SELECT id, material_id, course_id, user_id, title, course_code, chunk_index, content, embedding_json FROM material_chunks WHERE user_id = ?"
            params = [user_id]
            if course_id:
                query_sql += " AND course_id = ?"
                params.append(str(course_id))

            cursor = conn.execute(query_sql, params)
            rows = cursor.fetchall()

            for row in rows:
                content = row[7]
                emb_json = row[8]
                try:
                    doc_emb = json.loads(emb_json)
                    sim = _cosine_similarity(query_embedding, doc_emb)
                except Exception:
                    sim = 0.0

                results.append({
                    "content": content,
                    "metadata": {
                        "material_id": row[1],
                        "course_id": row[2],
                        "user_id": row[3],
                        "title": row[4],
                        "course_code": row[5] or "",
                        "chunk_index": row[6]
                    },
                    "score": round(sim, 3)
                })

        # Sort descending by similarity score
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def retrieve_context(self, query: str, user_id: int, course_id: Optional[str] = None) -> str:
        """Formats retrieved chunks into grounded context for prompt injection."""
        results = self.search(query, user_id, course_id)
        if not results:
            return ""

        context_parts = []
        for r in results:
            title = r["metadata"].get("title", "Course Material")
            course = r["metadata"].get("course_code", "")
            content = r["content"]
            score = r.get("score", 0.0)
            tag = f"Source: {title}" + (f" ({course})" if course else "") + f" [Relevance: {score}]"
            context_parts.append(f"[{tag}]\n{content}\n")

        return "\n".join(context_parts)

    def get_stats(self, user_id: int) -> Dict[str, Any]:
        """Returns statistics on the RAG index."""
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*), COUNT(DISTINCT material_id), COUNT(DISTINCT course_id) FROM material_chunks WHERE user_id = ?", (user_id,))
            row = cur.fetchone()
            return {
                "total_chunks": row[0] if row else 0,
                "indexed_materials": row[1] if row else 0,
                "courses_covered": row[2] if row else 0,
                "backend": self.backend,
            }


# Global singleton instance
rag_service = RAGService()
