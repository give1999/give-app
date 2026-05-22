/**
 * Форматирует техническое название модели для отображения в UI:
 * 1. Заменяет тире на пробелы
 * 2. Каждое слово начинается с заглавной буквы
 *
 * Примеры:
 *   "gpt-4o"          → "Gpt 4o"
 *   "claude-3.5-sonnet" → "Claude 3.5 Sonnet"
 *   "deepseek-r1"      → "Deepseek R1"
 */
export function formatModelName(id: string): string {
  return id
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}