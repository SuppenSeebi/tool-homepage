#!/bin/bash

# Skript zum Aktualisieren und Neustarten des Docker Compose Stacks
# Autor: ChatGPT für deine Tool-Plattform

set -e

echo "🛑 Stoppe Docker Compose..."
docker compose down

echo "🔄 Pulle neueste Git Änderungen..."
git pull

echo "🚀 Starte Docker Compose mit Build im Hintergrund..."
docker compose up --build -d

echo "✅ Deployment abgeschlossen."
