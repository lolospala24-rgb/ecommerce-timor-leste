const ENABLE_DEBUG = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ENABLE_DEBUG === 'true';

function safeLog(fn: (...args: any[]) => void, ...args: any[]) {
  if (ENABLE_DEBUG) fn(...args);
}

const logger = {
  debug: (...args: any[]) => safeLog(console.debug.bind(console), ...args),
  info: (...args: any[]) => safeLog(console.info.bind(console), ...args),
  warn: (...args: any[]) => safeLog(console.warn.bind(console), ...args),
  error: (...args: any[]) => safeLog(console.error.bind(console), ...args),
};

export default logger;
