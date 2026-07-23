"""JSON Formatter/Validator - formats and validates JSON text.

Every tool module exports exactly ROUTER (a router with one POST /run route) and META (registry
metadata) - see app/registry.py for how these get discovered and mounted. Nothing here imports
or registers itself anywhere else.
"""

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

ROUTER = APIRouter()

META = {
    "id": "json-formatter",
    "name": "JSON Formatter",
    "description": "Formats and validates JSON text.",
    "tags": ["text", "json", "dev"],
    "language": "python",
    "runtime": "Python 3.11",
    "sandbox": "none (reviewed & committed)",
    "dependencies": [],
    # Frontend renders one real input per field (see registry.py) and assembles them into the
    # POST /run body itself - the user never hand-writes or escapes JSON. "text" is deliberately
    # a plain multi-line field (raw, unescaped) even though the wire request wraps it in
    # {"text": "..."} - that wrapping is the frontend's job, not something authored here.
    "fields": [
        {"name": "text", "label": "JSON text to format", "type": "textarea", "default": '{"hello": "world", "nested": {"a": 1}}'},
        {"name": "indent", "label": "Indent (spaces)", "type": "number", "default": 2},
    ],
}


class RunInput(BaseModel):
    text: str
    indent: int = 2


@ROUTER.post("/run")
async def run(data: RunInput):
    try:
        parsed = json.loads(data.text)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON: {exc.msg} (line {exc.lineno}, column {exc.colno})",
        )
    return {"formatted": json.dumps(parsed, indent=data.indent)}
