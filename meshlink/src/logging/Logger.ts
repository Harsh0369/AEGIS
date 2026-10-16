/**
 * MeshLink — Structured Per-Node Logger
 *
 * Provides color-coded, timestamped, per-node logging.
 * Each node gets its own Logger instance with its ID as a prefix.
 */

/** Log levels in order of severity */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/** ANSI color codes for terminal output */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightCyan: '\x1b[96m',
} as const;

/** Color palette for node IDs — cycles for > 6 nodes */
const NODE_COLORS = [
  COLORS.cyan,
  COLORS.green,
  COLORS.magenta,
  COLORS.yellow,
  COLORS.blue,
  COLORS.brightCyan,
  COLORS.brightGreen,
  COLORS.brightYellow,
];

/** Map of log level to label and color */
const LEVEL_CONFIG: Record<LogLevel, { label: string; color: string }> = {
  [LogLevel.DEBUG]: { label: 'DBG', color: COLORS.dim },
  [LogLevel.INFO]:  { label: 'INF', color: COLORS.white },
  [LogLevel.WARN]:  { label: 'WRN', color: COLORS.yellow },
  [LogLevel.ERROR]: { label: 'ERR', color: COLORS.red },
};

/** Global color index counter for auto-assigning node colors */
let colorIndex = 0;

export class Logger {
  private readonly nodeId: string;
  private readonly nodeColor: string;
  private level: LogLevel;

  constructor(nodeId: string, level: LogLevel = LogLevel.INFO) {
    this.nodeId = nodeId;
    this.nodeColor = NODE_COLORS[colorIndex % NODE_COLORS.length]!;
    colorIndex++;
    this.level = level;
  }

  /** Set the minimum log level */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (level < this.level) return;

    const config = LEVEL_CONFIG[level];
    const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    const prefix = `${COLORS.dim}${timestamp}${COLORS.reset} ${config.color}${config.label}${COLORS.reset} ${this.nodeColor}[${this.nodeId}]${COLORS.reset}`;

    let line = `${prefix} ${message}`;

    if (data && Object.keys(data).length > 0) {
      const dataStr = Object.entries(data)
        .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join(' ');
      line += ` ${COLORS.dim}${dataStr}${COLORS.reset}`;
    }

    if (level >= LogLevel.ERROR) {
      console.error(line);
    } else {
      console.log(line);
    }
  }
}

/** Reset the color index — useful for tests */
export function resetLoggerColors(): void {
  colorIndex = 0;
}
