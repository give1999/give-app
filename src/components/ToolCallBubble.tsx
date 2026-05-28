import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Clipboard,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { ToolCallDisplay, ToolCallStatus } from '@/src/types';
import { spacing, radius, typography } from '@/src/design/theme';

// ─── Enable LayoutAnimation on Android ───
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ═══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

interface ToolCallBubbleProps {
  display: ToolCallDisplay;
  category?: string;
}

/** Which visual family a tool belongs to */
type VisualFamily = 'terminal' | 'gui';

/** Category → visual family mapping */
const CATEGORY_FAMILY: Record<string, VisualFamily> = {
  sandbox: 'terminal',
  code: 'terminal',
  data: 'gui',
  text: 'gui',
  web: 'gui',
  daemon: 'gui',
};

/** Tool name → custom renderer key (optional overrides) */
const TOOL_RENDERER: Record<string, string> = {
  // sandbox
  sandbox_exec: 'SandboxExec',
  sandbox_spawn: 'SandboxSpawn',
  sandbox_send: 'SandboxSend',
  sandbox_kill: 'SandboxKill',
  sandbox_env: 'SandboxEnv',
  sandbox_workspace: 'SandboxWorkspace',
  sandbox_writeScript: 'SandboxWriteScript',
  sandbox_install_pkg: 'SandboxInstallPkg',
  sandbox_listPkgs: 'SandboxListPkgs',
  // code
  code_run_python: 'CodeRunPython',
  code_run_js: 'CodeRunJs',
  code_run_sql: 'CodeRunSql',
  // data
  calc_math: 'DataCalc',
  calc_convert_units: 'DataConvertUnits',
  data_generate_password: 'DataPassword',
  data_hash: 'DataHash',
  data_encode: 'DataEncode',
  data_uuid: 'DataUuid',
  // text
  text_count: 'TextCount',
  text_tts: 'TextTts',
  text_stt: 'TextStt',
  text_translate: 'TextTranslate',
  text_regex: 'TextRegex',
  // web
  web_search: 'WebSearch',
  web_fetch: 'WebFetch',
  web_fetch_markdown: 'WebFetchMarkdown',
  // daemon
  daemon_submit: 'DaemonSubmit',
  daemon_status: 'DaemonStatus',
  daemon_cancel: 'DaemonCancel',
};

/** Tool name → semantic Ionicons name for the card header */
const TOOL_ICONS: Record<string, string> = {
  // sandbox
  sandbox_exec: 'terminal-outline',
  sandbox_spawn: 'play-circle-outline',
  sandbox_send: 'send-outline',
  sandbox_kill: 'skull-outline',
  sandbox_env: 'code-working-outline',
  sandbox_workspace: 'folder-open-outline',
  sandbox_writeScript: 'create-outline',
  sandbox_install_pkg: 'cube-outline',
  sandbox_listPkgs: 'list-outline',
  // code
  code_run_python: 'logo-python',
  code_run_js: 'logo-javascript',
  code_run_sql: 'server-outline',
  // data
  calc_math: 'calculator-outline',
  calc_convert_units: 'swap-horizontal-outline',
  data_generate_password: 'key-outline',
  data_hash: 'finger-print-outline',
  data_encode: 'code-outline',
  data_uuid: 'id-card-outline',
  // text
  text_count: 'stats-chart-outline',
  text_tts: 'volume-high-outline',
  text_stt: 'mic-outline',
  text_translate: 'language-outline',
  text_regex: 'search-outline',
  // web
  web_search: 'globe-outline',
  web_fetch: 'download-outline',
  web_fetch_markdown: 'document-text-outline',
  // daemon
  daemon_submit: 'cloud-upload-outline',
  daemon_status: 'pulse-outline',
  daemon_cancel: 'close-circle-outline',
};

const STATUS_META: Record<ToolCallStatus, { icon: string; color: string; label: string }> = {
  pending: { icon: 'ellipse-outline', color: '#8E8E93', label: 'Ожидание' },
  running: { icon: 'sync', color: '#FFD60A', label: 'Выполняется' },
  completed: { icon: 'checkmark-circle', color: '#30D158', label: 'Выполнено' },
  error: { icon: 'close-circle', color: '#FF453A', label: 'Ошибка' },
};

const FAMILY_COLORS = {
  terminal: {
    cardBg: '#151515',
    headerBg: '#1E1E1E',
    border: '#2D2D2D',
    text: '#E0E0E0',
    muted: '#858585',
    prompt: '#6A9955',
    error: '#F48771',
    success: '#4EC9B0',
    stdout: '#E0E0E0',
    stderr: '#F48771',
  },
  gui: {
    cardBg: '#141414',
    headerBg: '#1A1A1A',
    border: '#27272A',
    text: '#FFFFFF',
    muted: '#A1A1AA',
    accent: '#0A84FF',
    success: '#30D158',
    error: '#FF453A',
    warning: '#FF9F0A',
  },
};

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function safeJsonParse<T = unknown>(str: string | undefined): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function CopyButton({ text, size = 14 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    Clipboard.setString(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <Pressable onPress={handleCopy} style={sharedStyles.copyBtn} android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: true }}>
      <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={size} color={copied ? '#30D158' : '#71717A'} />
    </Pressable>
  );
}

function StatusDot({ status }: { status: ToolCallStatus }) {
  const meta = STATUS_META[status];
  return (
    <View style={[sharedStyles.statusDot, { backgroundColor: meta.color }]}>
      {status === 'running' && <View style={sharedStyles.pulseRing} />}
    </View>
  );
}

function Badge({ text, color = '#A1A1AA', bg = 'rgba(161,161,170,0.12)' }: { text: string; color?: string; bg?: string }) {
  return (
    <View style={[sharedStyles.badge, { backgroundColor: bg }]}>
      <Text style={[sharedStyles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

function GridRow({ label, children, labelWidth = 80 }: { label: string; children: React.ReactNode; labelWidth?: number }) {
  return (
    <View style={[sharedStyles.gridRow, { gap: spacing.sm }]}>
      <Text style={[sharedStyles.gridLabel, { width: labelWidth }]}>{label}</Text>
      <View style={sharedStyles.gridValue}>{children}</View>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={sharedStyles.sectionLabel}>{text}</Text>;
}

function MonoText({ children, color = '#E0E0E0', size = 11 }: { children: React.ReactNode; color?: string; size?: number }) {
  return <Text style={[sharedStyles.mono, { color, fontSize: size }]}>{children}</Text>;
}

// ═══════════════════════════════════════════════════════════════
// ACCORDION SHELL
// ═══════════════════════════════════════════════════════════════

function AccordionShell({
  family,
  display,
  children,
}: {
  family: VisualFamily;
  display: ToolCallDisplay;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(display.status === 'error' || display.status === 'running');
  const colors = FAMILY_COLORS[family];
  const meta = STATUS_META[display.status];
  const hasBody = !!display.result || !!display.error || Object.keys(display.args).length > 0;

  const toggle = useCallback(() => {
    if (!hasBody) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((p) => !p);
  }, [hasBody]);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Header */}
      <Pressable
        onPress={toggle}
        android_ripple={{ color: 'rgba(255,255,255,0.04)' }}
        style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}
      >
        <View style={styles.headerLeft}>
          {family === 'terminal' ? (
            <MonoText color={(colors as typeof FAMILY_COLORS.terminal).prompt} size={12}>{'❯'}</MonoText>
          ) : (
            <Ionicons name={(TOOL_ICONS[display.name] || 'cube-outline') as any} size={14} color={colors.muted} />
          )}
          <MonoText color={colors.text} size={12}>{display.name}</MonoText>
        </View>
        <View style={styles.headerRight}>
          <StatusDot status={display.status} />
          <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
          {hasBody && (
            <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={14} color={colors.muted} />
          )}
        </View>
      </Pressable>

      {/* Body */}
      {expanded && hasBody && (
        <View style={[styles.body, { backgroundColor: colors.cardBg }]}>
          {children}
        </View>
      )}
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL RENDERERS
// ═══════════════════════════════════════════════════════════════

function TerminalPrompt({ text }: { text: string }) {
  const c = FAMILY_COLORS.terminal;
  return (
    <View style={termStyles.promptRow}>
      <MonoText color={c.prompt} size={11}>$</MonoText>
      <MonoText color={c.muted} size={11}>{text}</MonoText>
    </View>
  );
}

function TerminalOutput({ text, isError = false }: { text: string; isError?: boolean }) {
  const c = FAMILY_COLORS.terminal;
  if (!text) return null;
  return (
    <View style={termStyles.outputBlock}>
      <ScrollView style={termStyles.outputScroll} nestedScrollEnabled showsVerticalScrollIndicator>
        <MonoText color={isError ? c.stderr : c.stdout} size={11}>{text}</MonoText>
      </ScrollView>
    </View>
  );
}

/** Parse sandbox result {stdout, stderr, exitCode, durationMs} */
function parseSandboxResult(result?: string): { stdout: string; stderr: string; exitCode: number; error?: string } {
  const parsed = safeJsonParse<Record<string, unknown>>(result);
  if (!parsed) return { stdout: result || '', stderr: '', exitCode: 0 };
  if (parsed.error && typeof parsed.error === 'string') {
    return { stdout: '', stderr: parsed.error, exitCode: parsed.exitCode as number ?? 1, error: parsed.error };
  }
  return {
    stdout: (parsed.stdout as string) || '',
    stderr: (parsed.stderr as string) || '',
    exitCode: (parsed.exitCode as number) ?? 0,
  };
}

// ─── sandbox/exec ───
function SandboxExecRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.terminal;
  const { stdout, stderr, exitCode, error } = parseSandboxResult(display.result);
  const cmd = truncate((display.args.command as string) || 'exec', 30);
  const hasError = exitCode !== 0 || !!error || display.status === 'error';

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text={`exec ${cmd}`} />
      {hasError ? (
        <TerminalOutput text={error || stderr || stdout} isError />
      ) : (
        <TerminalOutput text={stdout} />
      )}
      {exitCode !== 0 && (
        <View style={termStyles.exitCodeRow}>
          <MonoText color={c.error} size={11}>exit code: {exitCode}</MonoText>
        </View>
      )}
    </AccordionShell>
  );
}

// ─── sandbox/spawn ───
function SandboxSpawnRenderer({ display }: { display: ToolCallDisplay }) {
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const pid = parsed?.processId as string | undefined;
  const { stdout, stderr, exitCode } = parseSandboxResult(display.result);
  const name = (display.args.command as string) || 'spawn';

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text={`spawn ${truncate(name, 30)}`} />
      {pid && <MonoText color={FAMILY_COLORS.terminal.success} size={11}>[Process started with PID: {pid}]</MonoText>}
      {stdout ? <TerminalOutput text={stdout} /> : null}
      {stderr ? <TerminalOutput text={stderr} isError /> : null}
      {exitCode !== 0 && <MonoText color={FAMILY_COLORS.terminal.error} size={11}>exit code: {exitCode}</MonoText>}
    </AccordionShell>
  );
}

// ─── sandbox/send ───
function SandboxSendRenderer({ display }: { display: ToolCallDisplay }) {
  const pid = (display.args.pid as string) || '?';
  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text={`send input --pid ${pid}`} />
      <MonoText color={FAMILY_COLORS.terminal.success} size={11}>[Input sent to process {pid}]</MonoText>
    </AccordionShell>
  );
}

// ─── sandbox/kill ───
function SandboxKillRenderer({ display }: { display: ToolCallDisplay }) {
  const pid = (display.args.pid as string) || '?';
  const isError = display.status === 'error';
  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text={`kill --pid ${pid}`} />
      <MonoText color={isError ? FAMILY_COLORS.terminal.error : FAMILY_COLORS.terminal.success} size={11}>
        {isError ? `[Failed to terminate process ${pid}]` : `[Process ${pid} terminated successfully]`}
      </MonoText>
    </AccordionShell>
  );
}

// ─── sandbox/env ───
function SandboxEnvRenderer({ display }: { display: ToolCallDisplay }) {
  const { stdout } = parseSandboxResult(display.result);
  const lines = stdout.split('\n').filter(Boolean);
  const action = (display.args.action as string) || 'list';

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text={action === 'list' ? 'printenv' : `env ${action} ${display.args.name || ''}`} />
      <View style={termStyles.envGrid}>
        {lines.map((line, i) => {
          const [k, ...v] = line.split('=');
          return (
            <View key={i} style={termStyles.envRow}>
              <MonoText color={FAMILY_COLORS.terminal.muted} size={11}>{k}</MonoText>
              <MonoText color={FAMILY_COLORS.terminal.text} size={11}>{v.join('=')}</MonoText>
            </View>
          );
        })}
      </View>
    </AccordionShell>
  );
}

// ─── sandbox/workspace ───
function SandboxWorkspaceRenderer({ display }: { display: ToolCallDisplay }) {
  const { stdout } = parseSandboxResult(display.result);
  const lines = stdout.split('\n').filter(Boolean);
  const action = (display.args.action as string) || 'pwd';

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text={action === 'tree' ? 'ls -la ./workspace' : `workspace ${action}`} />
      <View style={termStyles.fileTree}>
        {lines.map((line, i) => {
          const isDir = line.endsWith('/');
          return (
            <View key={i} style={termStyles.fileRow}>
              <MonoText color={isDir ? '#4FC1FF' : '#E0E0E0'} size={11}>
                {isDir ? '📁' : '📄'} {line.split('\\').join('/').split('/').pop() || line}
              </MonoText>
            </View>
          );
        })}
      </View>
    </AccordionShell>
  );
}

// ─── sandbox/writeScript ───
function SandboxWriteScriptRenderer({ display }: { display: ToolCallDisplay }) {
  const { stdout, stderr, exitCode } = parseSandboxResult(display.result);
  const isError = exitCode !== 0 || display.status === 'error';
  const filename = (display.args.filename as string) || 'script.sh';

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text={`cat << 'EOF' > ${filename}`} />
      {isError ? (
        <TerminalOutput text={stderr || stdout} isError />
      ) : (
        <MonoText color={FAMILY_COLORS.terminal.success} size={11}>
          [File '{filename}' written successfully]
        </MonoText>
      )}
    </AccordionShell>
  );
}

// ─── sandbox/installPkg ───
function SandboxInstallPkgRenderer({ display }: { display: ToolCallDisplay }) {
  const { stdout, stderr, exitCode } = parseSandboxResult(display.result);
  const pkg = (display.args.package as string) || (display.args.name as string) || 'package';
  const isError = exitCode !== 0 || display.status === 'error';

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text={`npm install ${truncate(pkg, 25)}`} />
      {isError ? (
        <TerminalOutput text={stderr || stdout} isError />
      ) : (
        <MonoText color={FAMILY_COLORS.terminal.success} size={11}>
          {stdout ? truncate(stdout.trim(), 120) : `${pkg} installed successfully`}
        </MonoText>
      )}
    </AccordionShell>
  );
}

// ─── sandbox/listPkgs ───
function SandboxListPkgsRenderer({ display }: { display: ToolCallDisplay }) {
  const { stdout } = parseSandboxResult(display.result);
  const lines = stdout.split('\n').filter(Boolean).slice(0, 20);

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text="pip list" />
      <View style={termStyles.pkgTable}>
        {lines.map((line, i) => {
          const parts = line.trim().split(/\s+/);
          return (
            <View key={i} style={termStyles.pkgRow}>
              <MonoText color={FAMILY_COLORS.terminal.text} size={11}>{parts[0]}</MonoText>
              <MonoText color={FAMILY_COLORS.terminal.muted} size={11}>{parts[1] || ''}</MonoText>
            </View>
          );
        })}
      </View>
    </AccordionShell>
  );
}

// ─── code/runPython ───
function CodeRunPythonRenderer({ display }: { display: ToolCallDisplay }) {
  const { stdout, stderr, exitCode } = parseSandboxResult(display.result);
  const isError = exitCode !== 0 || display.status === 'error';

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text="python3 script.py" />
      {isError && stderr ? <TerminalOutput text={stderr} isError /> : null}
      {stdout ? <TerminalOutput text={stdout} /> : null}
    </AccordionShell>
  );
}

// ─── code/runJs ───
function CodeRunJsRenderer({ display }: { display: ToolCallDisplay }) {
  const { stdout, stderr, exitCode } = parseSandboxResult(display.result);
  const isError = exitCode !== 0 || display.status === 'error';

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text="node index.js" />
      {isError && stderr ? <TerminalOutput text={stderr} isError /> : null}
      {stdout ? <TerminalOutput text={stdout} /> : null}
    </AccordionShell>
  );
}

// ─── code/runSql ───
function CodeRunSqlRenderer({ display }: { display: ToolCallDisplay }) {
  const { stdout, stderr, exitCode } = parseSandboxResult(display.result);
  const isError = exitCode !== 0 || display.status === 'error';

  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text="sqlite3 db.sqlite" />
      {isError && stderr ? <TerminalOutput text={stderr} isError /> : null}
      {stdout ? (
        <View style={termStyles.sqlTable}>
          {stdout.split('\n').filter(Boolean).map((line, i) => (
            <View key={i} style={termStyles.sqlRow}>
              {line.split('|').map((cell, j) => (
                <View key={j} style={termStyles.sqlCell}>
                  <MonoText color={FAMILY_COLORS.terminal.text} size={11}>{cell.trim()}</MonoText>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </AccordionShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// GUI RENDERERS
// ═══════════════════════════════════════════════════════════════

// ─── data/calc ───
function DataCalcRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const expr = (display.args.expression as string) || '';
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const stdout = (parsed?.stdout as string) || (display.result || '').replace(/[{}"]/g, '');
  const value = stdout.trim();

  return (
    <AccordionShell family="gui" display={display}>
      <SectionLabel text="Выражение" />
      <Text style={[guiStyles.bigExpr, { color: c.text }]}>{expr}</Text>
      <View style={[guiStyles.resultBox, { borderColor: c.border }]}>
        <Text style={[guiStyles.resultValue, { color: c.success }]}>{value}</Text>
        <CopyButton text={value} />
      </View>
    </AccordionShell>
  );
}

// ─── data/convertUnits ───
function DataConvertUnitsRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const { value, from, to } = display.args as Record<string, string>;
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const stdout = (parsed?.stdout as string) || '';
  const result = stdout.trim() || display.result || '';

  return (
    <AccordionShell family="gui" display={display}>
      <View style={guiStyles.convertRow}>
        <Badge text={`${value} ${from}`} color={c.text} bg="rgba(255,255,255,0.08)" />
        <Text style={{ color: c.muted, fontSize: 16 }}>➔</Text>
        <Badge text={`${result} ${to}`} color={c.success} bg="rgba(48,209,88,0.12)" />
      </View>
    </AccordionShell>
  );
}

// ─── data/password ───
function DataPasswordRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const password = (parsed?.password as string) || display.result || '';
  const { length, uppercase, numbers, symbols } = display.args as Record<string, unknown>;

  return (
    <AccordionShell family="gui" display={display}>
      <View style={guiStyles.paramBadges}>
        {length != null && <Badge text={`length: ${length}`} color="#0A84FF" bg="rgba(10,132,255,0.12)" />}
        {uppercase === true && <Badge text="uppercase" color="#FF9F0A" bg="rgba(255,159,10,0.12)" />}
        {numbers === true && <Badge text="numbers" color="#30D158" bg="rgba(48,209,88,0.12)" />}
        {symbols === true && <Badge text="symbols" color="#FF453A" bg="rgba(255,69,58,0.12)" />}
      </View>
      <View style={[guiStyles.resultBox, { borderColor: c.border }]}>
        <Text style={[guiStyles.passwordText, { color: c.text }]}>{password}</Text>
        <CopyButton text={password} />
      </View>
    </AccordionShell>
  );
}

// ─── data/hash ───
function DataHashRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const stdout = (parsed?.stdout as string) || display.result || '';
  const hash = stdout.trim();
  const algo = (display.args.algorithm as string) || 'sha256';
  const input = (display.args.input as string) || '';

  return (
    <AccordionShell family="gui" display={display}>
      <SectionLabel text="Входные данные" />
      <View style={guiStyles.grid}>
        <GridRow label="algorithm">
          <Badge text={algo} color="#4EC9B0" bg="rgba(78,201,176,0.12)" />
        </GridRow>
        <GridRow label="input">
          <Text style={[guiStyles.gridValueText, { color: c.muted }]} numberOfLines={2}>{input}</Text>
        </GridRow>
      </View>
      <View style={[guiStyles.resultBox, { borderColor: c.border, marginTop: spacing.md }]}>
        <Text style={[guiStyles.hashText, { color: c.text }]} numberOfLines={1}>{hash}</Text>
        <CopyButton text={hash} />
      </View>
    </AccordionShell>
  );
}

// ─── data/encode ───
function DataEncodeRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const stdout = (parsed?.stdout as string) || display.result || '';
  const result = stdout.trim();
  const { format, action } = display.args as Record<string, string>;

  return (
    <AccordionShell family="gui" display={display}>
      <View style={guiStyles.paramBadges}>
        {format && <Badge text={format} color="#0A84FF" bg="rgba(10,132,255,0.12)" />}
        {action && <Badge text={action} color="#FF9F0A" bg="rgba(255,159,10,0.12)" />}
      </View>
      <View style={[guiStyles.resultBox, { borderColor: c.border }]}>
        <Text style={[guiStyles.hashText, { color: c.text }]} numberOfLines={3}>{result}</Text>
        <CopyButton text={result} />
      </View>
    </AccordionShell>
  );
}

// ─── data/uuid ───
function DataUuidRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const uuid = (parsed?.uuid as string) || (parsed?.stdout as string)?.trim() || display.result || '';

  return (
    <AccordionShell family="gui" display={display}>
      <View style={[guiStyles.resultBox, { borderColor: c.border }]}>
        <Text style={[guiStyles.uuidText, { color: c.text }]}>{uuid}</Text>
        <CopyButton text={uuid} />
      </View>
    </AccordionShell>
  );
}

// ─── text/count ───
function TextCountRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const text = (display.args.text as string) || '';
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const stdout = (parsed?.stdout as string) || display.result || '';

  // Try to parse counts from stdout or result
  let counts: Record<string, number> = {};
  try {
    counts = JSON.parse(stdout);
  } catch {
    // fallback: extract numbers from text
  }

  const withSpaces = text.length;
  const withoutSpaces = text.replace(/\s/g, '').length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <AccordionShell family="gui" display={display}>
      <View style={guiStyles.countGrid}>
        <View style={guiStyles.countRow}>
          <Text style={[guiStyles.countLabel, { color: c.muted }]}>Символов (с пробелами)</Text>
          <Text style={[guiStyles.countValue, { color: c.text }]}>{counts.characters ?? counts.withSpaces ?? withSpaces}</Text>
        </View>
        <View style={guiStyles.countRow}>
          <Text style={[guiStyles.countLabel, { color: c.muted }]}>Символов (без пробелов)</Text>
          <Text style={[guiStyles.countValue, { color: c.text }]}>{counts.charactersNoSpaces ?? counts.withoutSpaces ?? withoutSpaces}</Text>
        </View>
        <View style={guiStyles.countRow}>
          <Text style={[guiStyles.countLabel, { color: c.muted }]}>Слов</Text>
          <Text style={[guiStyles.countValue, { color: c.text }]}>{counts.words ?? words}</Text>
        </View>
      </View>
    </AccordionShell>
  );
}

// ─── text/tts ───
function TextTtsRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const voice = (display.args.voice as string) || 'default';
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const url = (parsed?.url as string) || (parsed?.audioUrl as string) || '';

  return (
    <AccordionShell family="gui" display={display}>
      <View style={guiStyles.paramBadges}>
        <Badge text={voice} color="#0A84FF" bg="rgba(10,132,255,0.12)" />
      </View>
      {url ? (
        <View style={[guiStyles.audioPlayer, { borderColor: c.border }]}>
          <Ionicons name="musical-note" size={20} color={c.muted} />
          <Text style={[guiStyles.audioText, { color: c.muted }]}>Аудио готово</Text>
          <Ionicons name="play-circle" size={28} color={c.accent} />
        </View>
      ) : (
        <MonoText color={c.muted} size={11}>Генерация аудио...</MonoText>
      )}
    </AccordionShell>
  );
}

// ─── text/stt ───
function TextSttRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const transcript = (parsed?.transcript as string) || (parsed?.text as string) || (parsed?.stdout as string)?.trim() || display.result || '';

  return (
    <AccordionShell family="gui" display={display}>
      <View style={[guiStyles.quoteBlock, { borderColor: c.border }]}>
        <Text style={[guiStyles.quoteText, { color: c.text }]}>"{transcript}"</Text>
        <CopyButton text={transcript} />
      </View>
    </AccordionShell>
  );
}

// ─── text/translate ───
function TextTranslateRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const from = (display.args.from as string) || 'auto';
  const to = (display.args.to as string) || 'en';
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const stdout = (parsed?.stdout as string) || display.result || '';
  const translated = stdout.trim();

  return (
    <AccordionShell family="gui" display={display}>
      <View style={guiStyles.paramBadges}>
        <Badge text={`${from.toUpperCase()} ➔ ${to.toUpperCase()}`} color="#0A84FF" bg="rgba(10,132,255,0.12)" />
      </View>
      <View style={[guiStyles.translateBox, { borderColor: c.border }]}>
        <Text style={[guiStyles.translateText, { color: c.text }]}>{translated}</Text>
      </View>
    </AccordionShell>
  );
}

// ─── text/regex ───
function TextRegexRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const regex = (display.args.regex as string) || '';
  const text = (display.args.text as string) || '';
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const stdout = (parsed?.stdout as string) || display.result || '';

  // Try to highlight matches
  let highlighted = text;
  try {
    const re = new RegExp(regex, 'g');
    const matches = text.match(re);
    if (matches) {
      highlighted = text;
    }
  } catch {
    // ignore invalid regex
  }

  return (
    <AccordionShell family="gui" display={display}>
      <View style={guiStyles.paramBadges}>
        <Badge text={regex} color="#FF9F0A" bg="rgba(255,159,10,0.12)" />
      </View>
      <View style={[guiStyles.regexBox, { borderColor: c.border }]}>
        <Text style={[guiStyles.regexText, { color: c.text }]}>{highlighted}</Text>
      </View>
      {stdout ? <Text style={[guiStyles.regexResult, { color: c.muted }]}>{stdout}</Text> : null}
    </AccordionShell>
  );
}

// ─── web/search ───
function WebSearchRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const query = (display.args.query as string) || '';
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  let results: Array<{ title?: string; url?: string; snippet?: string; Text?: string; FirstURL?: string }> = [];

  try {
    const stdout = (parsed?.stdout as string) || '';
    if (stdout) {
      const inner = JSON.parse(stdout);
      if (Array.isArray(inner)) results = inner;
    }
  } catch {
    // ignore
  }

  const visible = results.slice(0, 3);
  const hidden = results.slice(3);
  const [showAll, setShowAll] = useState(false);

  return (
    <AccordionShell family="gui" display={display}>
      <SectionLabel text={`Поиск: "${truncate(query, 40)}"`} />
      <View style={guiStyles.searchList}>
        {visible.map((r, i) => (
          <View key={i} style={[guiStyles.searchItem, { borderColor: c.border }]}>
            <Text style={[guiStyles.searchTitle, { color: c.accent }]} numberOfLines={1}>{r.title || r.Text || 'Результат'}</Text>
            <Text style={[guiStyles.searchUrl, { color: c.success }]} numberOfLines={1}>{r.url || r.FirstURL || ''}</Text>
            <Text style={[guiStyles.searchSnippet, { color: c.muted }]} numberOfLines={2}>{r.snippet || r.Text || ''}</Text>
          </View>
        ))}
        {showAll && hidden.map((r, i) => (
          <View key={`h${i}`} style={[guiStyles.searchItem, { borderColor: c.border }]}>
            <Text style={[guiStyles.searchTitle, { color: c.accent }]} numberOfLines={1}>{r.title || r.Text || 'Результат'}</Text>
            <Text style={[guiStyles.searchUrl, { color: c.success }]} numberOfLines={1}>{r.url || r.FirstURL || ''}</Text>
            <Text style={[guiStyles.searchSnippet, { color: c.muted }]} numberOfLines={2}>{r.snippet || r.Text || ''}</Text>
          </View>
        ))}
        {hidden.length > 0 && (
          <Pressable onPress={() => setShowAll((p) => !p)} style={guiStyles.showMoreBtn}>
            <Text style={[guiStyles.showMoreText, { color: c.accent }]}>
              {showAll ? 'Свернуть' : `Показать ещё ${hidden.length}`}
            </Text>
          </Pressable>
        )}
      </View>
    </AccordionShell>
  );
}

// ─── web/fetch ───
function WebFetchRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const url = (display.args.url as string) || '';
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const stdout = (parsed?.stdout as string) || display.result || '';

  return (
    <AccordionShell family="gui" display={display}>
      <Badge text={truncate(url, 40)} color={c.accent} bg="rgba(10,132,255,0.12)" />
      <ScrollView style={[guiStyles.fetchScroll, { borderColor: c.border }]} nestedScrollEnabled showsVerticalScrollIndicator>
        <Text style={[guiStyles.fetchText, { color: c.text }]}>{stdout}</Text>
      </ScrollView>
    </AccordionShell>
  );
}

// ─── web/fetchMarkdown ───
function WebFetchMarkdownRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const url = (display.args.url as string) || '';
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const stdout = (parsed?.stdout as string) || display.result || '';

  return (
    <AccordionShell family="gui" display={display}>
      <Badge text={truncate(url, 40)} color={c.accent} bg="rgba(10,132,255,0.12)" />
      <ScrollView style={[guiStyles.fetchScroll, { borderColor: c.border }]} nestedScrollEnabled showsVerticalScrollIndicator>
        <Text style={[guiStyles.fetchText, { color: c.text }]}>{stdout}</Text>
      </ScrollView>
    </AccordionShell>
  );
}

// ─── daemon/submit ───
function DaemonSubmitRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const taskId = (parsed?.taskId as string) || '';
  const status = (parsed?.status as string) || 'pending';

  return (
    <AccordionShell family="gui" display={display}>
      <View style={guiStyles.daemonRow}>
        <Text style={[guiStyles.daemonLabel, { color: c.muted }]}>Task ID</Text>
        <MonoText color={c.text} size={11}>{taskId}</MonoText>
      </View>
      <View style={guiStyles.daemonRow}>
        <Text style={[guiStyles.daemonLabel, { color: c.muted }]}>Статус</Text>
        <Badge text={status} color={c.accent} bg="rgba(10,132,255,0.12)" />
      </View>
      <View style={[guiStyles.progressTrack, { backgroundColor: c.border }]}>
        <View style={[guiStyles.progressFill, { backgroundColor: c.accent, width: '10%' }]} />
      </View>
    </AccordionShell>
  );
}

// ─── daemon/status ───
function DaemonStatusRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const parsed = safeJsonParse<Record<string, unknown>>(display.result);
  const status = (parsed?.status as string) || 'unknown';
  const progress = (parsed?.progress as number) || 0;

  const statusColor = status === 'completed' ? c.success : status === 'running' ? c.accent : status === 'error' ? c.error : c.muted;
  const statusBg = status === 'completed' ? 'rgba(48,209,88,0.12)' : status === 'running' ? 'rgba(10,132,255,0.12)' : status === 'error' ? 'rgba(255,69,58,0.12)' : 'rgba(161,161,170,0.12)';

  return (
    <AccordionShell family="gui" display={display}>
      <View style={guiStyles.daemonRow}>
        <Text style={[guiStyles.daemonLabel, { color: c.muted }]}>Статус</Text>
        <Badge text={status} color={statusColor} bg={statusBg} />
      </View>
      <View style={[guiStyles.progressTrack, { backgroundColor: c.border }]}>
        <View style={[guiStyles.progressFill, { backgroundColor: statusColor, width: `${Math.min(progress, 100)}%` }]} />
      </View>
      <Text style={[guiStyles.progressText, { color: c.muted }]}>{Math.round(progress)}%</Text>
    </AccordionShell>
  );
}

// ─── daemon/cancel ───
function DaemonCancelRenderer({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const isError = display.status === 'error';

  return (
    <AccordionShell family="gui" display={display}>
      <View style={[guiStyles.cancelCard, { borderColor: isError ? c.error : c.border }]}>
        <Ionicons name={isError ? 'close-circle' : 'checkmark-circle'} size={20} color={isError ? c.error : c.success} />
        <Text style={[guiStyles.cancelText, { color: isError ? c.error : c.muted }]}>
          {isError ? 'Не удалось отменить задачу' : 'Задача отменена'}
        </Text>
      </View>
    </AccordionShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK RENDERERS
// ═══════════════════════════════════════════════════════════════

function TerminalFallback({ display }: { display: ToolCallDisplay }) {
  const { stdout, stderr, exitCode } = parseSandboxResult(display.result);
  const isError = exitCode !== 0 || display.status === 'error';
  return (
    <AccordionShell family="terminal" display={display}>
      <TerminalPrompt text={display.name} />
      {isError && stderr ? <TerminalOutput text={stderr} isError /> : null}
      {stdout ? <TerminalOutput text={stdout} /> : null}
    </AccordionShell>
  );
}

function GUIFallback({ display }: { display: ToolCallDisplay }) {
  const c = FAMILY_COLORS.gui;
  const result = display.result || '';
  return (
    <AccordionShell family="gui" display={display}>
      <View style={[guiStyles.resultBox, { borderColor: c.border }]}>
        <Text style={[guiStyles.hashText, { color: c.text }]} numberOfLines={5}>{result}</Text>
        <CopyButton text={result} />
      </View>
    </AccordionShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DISPATCHER
// ═══════════════════════════════════════════════════════════════

export default function ToolCallBubble({ display, category = 'sandbox' }: ToolCallBubbleProps) {
  const effectiveCategory = display.category || category;
  const family = CATEGORY_FAMILY[effectiveCategory] || 'gui';
  const rendererKey = TOOL_RENDERER[display.name] || (family === 'terminal' ? 'TerminalFallback' : 'GUIFallback');

  const renderer = useMemo(() => {
    switch (rendererKey) {
      // Terminal
      case 'SandboxExec': return <SandboxExecRenderer display={display} />;
      case 'SandboxSpawn': return <SandboxSpawnRenderer display={display} />;
      case 'SandboxSend': return <SandboxSendRenderer display={display} />;
      case 'SandboxKill': return <SandboxKillRenderer display={display} />;
      case 'SandboxEnv': return <SandboxEnvRenderer display={display} />;
      case 'SandboxWorkspace': return <SandboxWorkspaceRenderer display={display} />;
      case 'SandboxWriteScript': return <SandboxWriteScriptRenderer display={display} />;
      case 'SandboxInstallPkg': return <SandboxInstallPkgRenderer display={display} />;
      case 'SandboxListPkgs': return <SandboxListPkgsRenderer display={display} />;
      case 'CodeRunPython': return <CodeRunPythonRenderer display={display} />;
      case 'CodeRunJs': return <CodeRunJsRenderer display={display} />;
      case 'CodeRunSql': return <CodeRunSqlRenderer display={display} />;
      // GUI
      case 'DataCalc': return <DataCalcRenderer display={display} />;
      case 'DataConvertUnits': return <DataConvertUnitsRenderer display={display} />;
      case 'DataPassword': return <DataPasswordRenderer display={display} />;
      case 'DataHash': return <DataHashRenderer display={display} />;
      case 'DataEncode': return <DataEncodeRenderer display={display} />;
      case 'DataUuid': return <DataUuidRenderer display={display} />;
      case 'TextCount': return <TextCountRenderer display={display} />;
      case 'TextTts': return <TextTtsRenderer display={display} />;
      case 'TextStt': return <TextSttRenderer display={display} />;
      case 'TextTranslate': return <TextTranslateRenderer display={display} />;
      case 'TextRegex': return <TextRegexRenderer display={display} />;
      case 'WebSearch': return <WebSearchRenderer display={display} />;
      case 'WebFetch': return <WebFetchRenderer display={display} />;
      case 'WebFetchMarkdown': return <WebFetchMarkdownRenderer display={display} />;
      case 'DaemonSubmit': return <DaemonSubmitRenderer display={display} />;
      case 'DaemonStatus': return <DaemonStatusRenderer display={display} />;
      case 'DaemonCancel': return <DaemonCancelRenderer display={display} />;
      // Fallbacks
      case 'TerminalFallback': return <TerminalFallback display={display} />;
      default: return <GUIFallback display={display} />;
    }
  }, [rendererKey, display]);

  return renderer;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusLabel: {
    fontSize: typography.xs.fontSize,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
});

const sharedStyles = StyleSheet.create({
  copyBtn: {
    padding: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,214,10,0.3)',
    top: -4,
    left: -4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gridLabel: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  gridValue: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 9,
    color: '#71717A',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
});

const termStyles = StyleSheet.create({
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  outputBlock: {
    backgroundColor: '#0D0D0D',
    borderRadius: radius.md,
    padding: spacing.sm,
    maxHeight: 200,
  },
  outputScroll: {
    maxHeight: 180,
  },
  exitCodeRow: {
    marginTop: spacing.xs,
  },
  envGrid: {
    gap: spacing.xs,
  },
  envRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  fileTree: {
    gap: 2,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pkgTable: {
    gap: 2,
  },
  pkgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sqlTable: {
    gap: 1,
  },
  sqlRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    paddingVertical: 2,
  },
  sqlCell: {
    minWidth: 60,
  },
});

const guiStyles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  gridValueText: {
    fontSize: 11,
    lineHeight: 16,
  },
  paramBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm - 2,
    gap: spacing.sm,
  },
  bigExpr: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  passwordText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  hashText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  uuidText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  convertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  countGrid: {
    gap: spacing.sm,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 12,
  },
  countValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  audioText: {
    fontSize: 12,
    flex: 1,
  },
  quoteBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    flex: 1,
  },
  translateBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  translateText: {
    fontSize: 14,
    lineHeight: 20,
  },
  regexBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  regexText: {
    fontSize: 13,
    lineHeight: 18,
  },
  regexResult: {
    fontSize: 11,
    marginTop: spacing.xs,
  },
  searchList: {
    gap: spacing.sm,
  },
  searchItem: {
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  searchTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchUrl: {
    fontSize: 10,
  },
  searchSnippet: {
    fontSize: 11,
    lineHeight: 16,
  },
  showMoreBtn: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fetchScroll: {
    maxHeight: 150,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  fetchText: {
    fontSize: 12,
    lineHeight: 18,
  },
  daemonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  daemonLabel: {
    fontSize: 11,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 2,
  },
  cancelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  cancelText: {
    fontSize: 13,
  },
});