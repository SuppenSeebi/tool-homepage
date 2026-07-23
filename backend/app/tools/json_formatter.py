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
    # Frontend pre-fills the Run tab's input with this - the generic run UI (any tool, JSON
    # in/out) has no way to know a given tool's expected shape otherwise. This one specifically
    # needs {"text": "..."} (a JSON *string* to validate), not the object to format directly -
    # that's the whole point of the tool (catching malformed JSON with a useful error).
    "example": {"text": '{"hello": "world", "nested": {"a": 1}}', "indent": 2},
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
