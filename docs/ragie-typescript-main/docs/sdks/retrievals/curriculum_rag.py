"""Curriculum RAG tool (HTTP version).

Uses Ragie.ai retrieval endpoint directly, avoiding the Ragie Python SDK.
Returns the same structure as other tools so agents can consume uniformly.
"""
from __future__ import annotations

import os
import requests
from typing import List, Dict, Any, Union

RAGIE_ENDPOINT = "https://api.ragie.ai/retrievals"


def _retrieve_one(query: str, api_key: str, partition: str | None, top_k: int) -> List[Dict[str, str]]:
    """Call Ragie /retrievals and return list of chunk dicts."""

    body: Dict[str, Any] = {"query": query, "top_k": top_k}
    if partition and partition.lower() != "none":
        body["partition"] = partition

    resp = requests.post(
        RAGIE_ENDPOINT,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json=body,
        timeout=30,
    )
    resp.raise_for_status()

    data = resp.json() or {}

    # Ragie response variants
    # 1. {"chunks": [...]} (current default)
    # 2. {"results": [...]} (older API)
    # 3. {"scored_chunks": [...]} (beta scoring)
    # 4. {"retrieval": {"chunks": [...]}}
    chunks = (
        data.get("chunks")
        or data.get("results")
        or data.get("scored_chunks")
        or data.get("retrieval", {}).get("chunks")
        or []
    )

    items: List[Dict[str, str]] = []
    for chunk in chunks:
        items.append(
            {
                "source": chunk.get("source_url") or chunk.get("document_id") or "unknown",
                "text": chunk.get("text", ""),
            }
        )
    return items


def curriculum_rag(queries: Union[str, List[str]], top_k: int = 20) -> Dict[str, Any]:
    """Retrieve curriculum passages via Ragie.ai.

    Args:
        queries: single query or list.
        top_k: number of chunks to fetch (Ragie default is 20).
    """
    api_key = os.getenv("RAGIE_API_KEY")
    if not api_key:
        raise ValueError("RAGIE_API_KEY not set in environment")

    partition = os.getenv("RAGIE_PARTITION_ID")

    if isinstance(queries, str):
        queries = [queries]

    structured: Dict[str, Any] = {"queries": queries, "results": []}
    for q in queries:
        try:
            data_items = _retrieve_one(q, api_key, partition, top_k)
        except Exception as exc:  # pragma: no cover
            print(f"[RAGIE] retrieval error for '{q}': {exc}")
            data_items = []
        structured["results"].append({"query": q, "data": data_items})

    return structured
