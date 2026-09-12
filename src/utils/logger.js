export const logger = {
  info: (msg, ...args) => console.log(`[INFO]  ${new Date().toISOString()} - ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN]  ${new Date().toISOString()} - ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, ...args),
  success: (msg, ...args) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`, ...args)
};
