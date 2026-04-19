type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

function formatDev(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString().slice(11, 23);
  const tag = level.toUpperCase().padEnd(5);
  const base = `[${ts}] ${tag} ${message}`;
  return meta && Object.keys(meta).length > 0 ? `${base} ${JSON.stringify(meta)}` : base;
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  if (process.env.NODE_ENV === "production") {
    const entry = JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta });
    if (level === "error" || level === "warn") {
      process.stderr.write(entry + "\n");
    } else {
      process.stdout.write(entry + "\n");
    }
  } else {
    const formatted = formatDev(level, message, meta);
    if (level === "error") console.error(formatted);
    else if (level === "warn") console.warn(formatted);
    else console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit("debug", message, meta),
  info:  (message: string, meta?: Record<string, unknown>) => emit("info",  message, meta),
  warn:  (message: string, meta?: Record<string, unknown>) => emit("warn",  message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit("error", message, meta),
  child: (defaultMeta: Record<string, unknown>) => ({
    debug: (message: string, meta?: Record<string, unknown>) => emit("debug", message, { ...defaultMeta, ...meta }),
    info:  (message: string, meta?: Record<string, unknown>) => emit("info",  message, { ...defaultMeta, ...meta }),
    warn:  (message: string, meta?: Record<string, unknown>) => emit("warn",  message, { ...defaultMeta, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) => emit("error", message, { ...defaultMeta, ...meta }),
  }),
};
