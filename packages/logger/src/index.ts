import { pino, type Logger } from 'pino';

/** Logs JSON structurés (un par ligne) : lisibles par n'importe quel collecteur en production. */
export function createLogger(service: string): Logger {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
      censor: '[masqué]',
    },
  });
}

export type { Logger };
