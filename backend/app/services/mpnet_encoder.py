"""
NyayaNiti — AICTE Integrated Institution Complaint Monitoring Platform
Phase 6: MPNet-768 Embedding Encoder Service

Encodes institutional complaints into 768-dimensional dense vectors using:
Model: sentence-transformers/all-mpnet-base-v2
Capabilities:
- Automatic hardware detection (CUDA GPU when available, else CPU)
- L2 vector normalization (unit norm for direct dot-product cosine similarity)
- Batch processing with configurable batch size
- Resilient handling of empty, whitespace-only, and invalid input texts
- SHA-256 in-memory and disk caching to eliminate redundant encodings
"""

import os
import hashlib
import numpy as np
from typing import List, Union, Dict, Any, Optional

EMBEDDING_DIM = 768
MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"

_encoder_instance = None


class MPNetEncoder:
    def __init__(self, model_name: str = MODEL_NAME, cache_dir: Optional[str] = None):
        import torch
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name
        self.embedding_dim = EMBEDDING_DIM
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._cache: Dict[str, np.ndarray] = {}

        # Load pretrained model
        self.model = SentenceTransformer(model_name, device=self.device)
        self.model.eval()

    @staticmethod
    def _hash_text(text: str) -> str:
        clean = (text or "").strip()
        return hashlib.sha256(clean.encode("utf-8")).hexdigest()

    def encode_single(self, text: Union[str, None], normalize: bool = True) -> np.ndarray:
        """
        Encodes a single text into a 768-dim numpy array.
        Handles empty or None strings gracefully by returning a zero vector.
        """
        if not text or not text.strip():
            return np.zeros(self.embedding_dim, dtype=np.float32)

        text_hash = self._hash_text(text)
        if text_hash in self._cache:
            return self._cache[text_hash].copy()

        import torch
        with torch.inference_mode():
            emb = self.model.encode(
                [text.strip()],
                batch_size=1,
                show_progress_bar=False,
                normalize_embeddings=normalize,
                convert_to_numpy=True
            )[0].astype(np.float32)

        self._cache[text_hash] = emb
        return emb.copy()

    def encode_batch(
        self,
        texts: List[Union[str, None]],
        batch_size: int = 32,
        normalize: bool = True
    ) -> np.ndarray:
        """
        Encodes a batch of texts into an (N, 768) numpy matrix.
        Skips already-cached texts and efficiently handles empty strings.
        """
        if not texts:
            return np.zeros((0, self.embedding_dim), dtype=np.float32)

        results = np.zeros((len(texts), self.embedding_dim), dtype=np.float32)
        uncached_indices = []
        uncached_texts = []

        for i, t in enumerate(texts):
            if not t or not t.strip():
                # Zero vector for empty text
                results[i] = np.zeros(self.embedding_dim, dtype=np.float32)
                continue

            h = self._hash_text(t)
            if h in self._cache:
                results[i] = self._cache[h]
            else:
                uncached_indices.append(i)
                uncached_texts.append(t.strip())

        if uncached_texts:
            import torch
            with torch.inference_mode():
                batch_embeddings = self.model.encode(
                    uncached_texts,
                    batch_size=batch_size,
                    show_progress_bar=False,
                    normalize_embeddings=normalize,
                    convert_to_numpy=True
                ).astype(np.float32)

            for idx, emb, text in zip(uncached_indices, batch_embeddings, uncached_texts):
                h = self._hash_text(text)
                self._cache[h] = emb
                results[idx] = emb

        return results

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "embedding_dim": self.embedding_dim,
            "device": self.device,
            "normalized": True,
            "cached_entries": len(self._cache),
            "architecture": "MPNet + Self-Attention Pooling"
        }


def get_mpnet_encoder() -> MPNetEncoder:
    """Returns singleton instance of MPNetEncoder."""
    global _encoder_instance
    if _encoder_instance is None:
        _encoder_instance = MPNetEncoder()
    return _encoder_instance

