"""Auto-discovery tool registry.

Adding a tool is dropping one file into app/tools/ that exports ROUTER (a FastAPI APIRouter
with exactly one POST /run route) and META (a dict describing it) - nothing else needs to
change. This is what drives tag/language grouping *and* the setup/source views on the frontend,
all from the same one entry per tool - see docs/redesign-plan.md's Section D.2.

Every tool's contract is POST /run (JSON in, JSON out) - the registry mounts each tool's router
under /app/tools/{id}, so a tool module only ever needs to define that one route on itself.
"""

import importlib
import pkgutil
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException

TOOLS_PACKAGE = "app.tools"
TOOLS_DIR = Path(__file__).parent / "tools"

REQUIRED_META_KEYS = {
    "id", "name", "description", "tags", "language", "runtime", "sandbox", "dependencies",
    # Input schema for this tool's POST /run - a list of {name, label, type, default}. The
    # generic Run UI (same form for every tool, since every tool shares one JSON-in/JSON-out
    # contract) renders one real input per field and assembles them into the request body
    # itself, so nobody hand-writes or escapes JSON to use a tool. Required, not optional, so
    # this can't quietly be skipped for a future tool - this replaced an earlier "example"
    # field (a whole example request body) that still made users hand-edit raw JSON themselves.
    "fields",
}

# id -> {**META, "_source_file": <path>} - the source file path is kept out of list_tools()'s
# output (that's not something the tag/language grouping view needs), only used by get_source().
_registry: dict[str, dict[str, Any]] = {}


def discover_and_mount(app: FastAPI) -> None:
    """Scans app/tools/*.py once, at startup. A module that doesn't define both ROUTER and META
    is silently skipped (not every .py file in this folder has to be a tool) - but a module that
    defines META with a missing required key is a real error, not skipped, since that's a tool
    author's mistake, not an absent tool."""
    for module_info in pkgutil.iter_modules([str(TOOLS_DIR)]):
        if module_info.name.startswith("_"):
            continue
        module = importlib.import_module(f"{TOOLS_PACKAGE}.{module_info.name}")
        router = getattr(module, "ROUTER", None)
        meta = getattr(module, "META", None)
        if router is None or meta is None:
            continue

        missing = REQUIRED_META_KEYS - meta.keys()
        if missing:
            raise ValueError(f"{module_info.name}.META is missing required key(s): {sorted(missing)}")

        tool_id = meta["id"]
        if tool_id in _registry:
            raise ValueError(f"Duplicate tool id {tool_id!r} (from {module_info.name})")

        app.include_router(router, prefix=f"/app/tools/{tool_id}")
        _registry[tool_id] = {**meta, "_source_file": module.__file__}


def list_tools() -> list[dict[str, Any]]:
    return [{k: v for k, v in meta.items() if not k.startswith("_")} for meta in _registry.values()]


def get_source(tool_id: str) -> str:
    meta = _registry.get(tool_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Tool {tool_id!r} not found")
    return Path(meta["_source_file"]).read_text(encoding="utf-8")
