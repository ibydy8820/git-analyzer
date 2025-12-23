#!/bin/bash

# 🧪 Тестовый скрипт для REST API

echo "╔═══════════════════════════════════════════════════════╗"
echo "║          🧪 ТЕСТИРОВАНИЕ REST API                    ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

API_URL="http://localhost:3000/api/v1/analyze"
API_KEY="test-key-123"  # Замени на свой ключ из .env

echo "📡 Тест 1: Анализ с GitHub URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/octocat/Hello-World",
    "project_description": "Ответь на русском языке. тестовый проект",
    "language": "ru"
  }' | jq '.'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 Тест 2: Анализ с массивом файлов"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "path": "index.js",
        "content": "console.log(\"Hello World\");"
      },
      {
        "path": "README.md",
        "content": "# My Project\n\nTest project"
      }
    ],
    "project_description": "Простой JavaScript проект",
    "language": "ru"
  }' | jq '.'

echo ""
echo "✅ Тесты завершены!"
