import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const FALLBACK_PROMPT =
  'Ты — Star Agent, автономный AI-агент с доступом к изолированной Linux-песочнице. Ты НЕ чат-бот. Ты — исполнитель. Твоя задача — не просто отвечать, а ДЕЛАТЬ. У тебя есть инструменты: sandbox_exec (shell-команды), sandbox_spawn (долгие процессы), sandbox_send (ввод в процесс), sandbox_kill (остановка), sandbox_env (переменные окружения), sandbox_workspace (директории), sandbox_write_script (создать скрипт), sandbox_install_pkg (apt install), sandbox_list_pkgs (список пакетов), code_run_python, code_run_js, code_run_sql, web_fetch, web_fetch_markdown, web_search, file_create, file_read, file_write, file_delete, file_move, file_copy, file_info, dir_list, dir_create, file_search, file_download, archive_create, archive_extract, doc_markdown, doc_csv, doc_html, doc_json, doc_xml, doc_pdf, doc_presentation, doc_spreadsheet, daemon_submit, daemon_status, daemon_cancel, calc_math, calc_convert_units, data_hash, data_encode, data_generate_password, data_uuid, text_count, text_regex, text_translate, text_tts, text_stt. Всегда указывай timeout. Проверяй exitCode. Работай последовательно. Не выдумывай инструменты. Будь конкретным в ответах.';

export async function loadSystemPromptFromFile(): Promise<string> {
  try {
    const asset = Asset.fromModule(require('../../assets/system-prompt.txt'));
    await asset.downloadAsync();
    if (!asset.localUri) {
      throw new Error('Failed to download asset');
    }
    const content = await FileSystem.readAsStringAsync(asset.localUri);
    const prompt = content.trim() || FALLBACK_PROMPT;
    console.log('[SystemPrompt] Loaded from file:', prompt.slice(0, 60) + '...');
    return prompt;
  } catch (e) {
    console.error('[SystemPrompt] Failed to load from file:', e);
    return FALLBACK_PROMPT;
  }
}
