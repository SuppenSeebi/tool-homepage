from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .registry import discover_and_mount, get_source, list_tools

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # spezifiziere Domains in Produktion
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Discovers every app/tools/*.py module that exports ROUTER + META and mounts it at
# /app/tools/{id} - adding a tool is dropping in one file, nothing here needs to change.
discover_and_mount(app)


@app.get("/app/tools")
async def get_tools():
    """Registry listing - drives tag/language grouping on the frontend."""
    return list_tools()


@app.get("/app/tools/{tool_id}/source")
async def get_tool_source(tool_id: str):
    """Raw source of one tool's implementation file, for the frontend's source view."""
    return {"source": get_source(tool_id)}
