import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolveLogFilePath = (): string | null => {
  const candidates = [
    path.resolve(__dirname, '../../google-patents-server.log'),
    path.resolve(
      process.env.HOME || process.env.USERPROFILE || '',
      '.google-patents-server.log'
    ),
    '/tmp/google-patents-server.log',
  ];

  for (const candidate of candidates) {
    try {
      fs.writeFileSync(
        candidate,
        `# Log file initialization at ${new Date().toISOString()}\n`,
        { flag: 'a' }
      );
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
};

export const createLogger = (logLevel: string): winston.Logger => {
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      return `[${String(info.timestamp)}] [${String(info.level)}] ${String(info.message)}`;
    })
  );

  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports: [new winston.transports.Console({ level: logLevel })],
  });

  const logFilePath = resolveLogFilePath();
  if (logFilePath) {
    try {
      const fileTransport = new winston.transports.File({
        filename: logFilePath,
        level: logLevel,
        options: { flags: 'a' },
      });
      logger.add(fileTransport);
      logger.debug(`Log file created at: ${logFilePath}`);
    } catch (err) {
      logger.warn(
        `Failed to setup file logging: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return logger;
};
