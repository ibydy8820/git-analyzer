#!/bin/bash

API_KEY=$(grep "API_SECRET_KEY" .env | cut -d'=' -f2)
API_URL="http://localhost:3000/api/v1/analyze-with-answers"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       🧪 ТЕСТ: Анализ с ответами на вопросы                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Отправляем ответы на уточняющие вопросы..."
echo "(это займёт ~10-20 секунд)"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "index.js", "content": "console.log(\"Hello World\");"},
      {"path": "package.json", "content": "{\"name\": \"test\"}"}
    ],
    "project_description": "Веб-приложение для управления задачами",
    "answers": {
      "project_purpose": "Помогает командам организовывать задачи и отслеживать прогресс проектов",
      "target_audience": "Небольшие команды разработчиков и стартапы",
      "project_type": "Веб-приложение с REST API",
      "main_features": "Создание задач, доски Kanban, уведомления, интеграция с GitHub",
      "your_skills": "JavaScript, React, Node.js, базовый опыт с базами данных"
    },
    "language": "ru"
  }')

SUCCESS=$(echo $RESPONSE | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
    echo "✅ Анализ с ответами выполнен успешно!"
    echo ""
    
    # Проверяем что есть анализ
    HAS_ANALYSIS=$(echo $RESPONSE | jq 'has("analysis")')
    
    if [ "$HAS_ANALYSIS" = "true" ]; then
        echo "📊 Результаты анализа:"
        echo ""
        
        SUMMARY=$(echo $RESPONSE | jq -r '.analysis.projectSummary')
        STAGE=$(echo $RESPONSE | jq -r '.analysis.detectedStage')
        TASKS_COUNT=$(echo $RESPONSE | jq '.analysis.tasks | length')
        ISSUES_COUNT=$(echo $RESPONSE | jq '.analysis.issues | length')
        
        echo "   📝 Описание:"
        echo "      $SUMMARY"
        echo ""
        echo "   🎯 Стадия: $STAGE"
        echo "   ✅ Задач: $TASKS_COUNT"
        echo "   ⚠️  Проблем: $ISSUES_COUNT"
        echo ""
        
        echo "   📋 Первые 3 задачи:"
        echo $RESPONSE | jq -r '.analysis.tasks[0:3][] | "      • \(.title) (\(.priority) приоритет)"'
        echo ""
        
        echo "   🎯 Следующая цель:"
        MILESTONE=$(echo $RESPONSE | jq -r '.analysis.nextMilestone')
        echo "      $MILESTONE"
        echo ""
        
        echo "   ⏱️  Метаданные:"
        echo "      Файлов: $(echo $RESPONSE | jq -r '.metadata.filesAnalyzed')"
        echo "      Время: $(echo $RESPONSE | jq -r '.metadata.analysisDurationMs')ms"
        
    else
        echo "⚠️  Анализ выполнен, но структура ответа неожиданная"
        echo $RESPONSE | jq '.'
    fi
else
    echo "❌ Ошибка при анализе с ответами!"
    echo ""
    echo "Ответ API:"
    echo $RESPONSE | jq '.'
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Полный ответ сохранён в /tmp/api_with_answers.json"
echo $RESPONSE > /tmp/api_with_answers.json
echo ""
