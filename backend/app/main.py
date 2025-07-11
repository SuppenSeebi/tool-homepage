from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .tools import CharCounter

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # spezifiziere Domains in Produktion
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tool Routen einbinden
app.include_router(CharCounter.router, prefix="/app")
