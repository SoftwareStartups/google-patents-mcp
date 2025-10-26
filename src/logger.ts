import winston from 'winston';

export const createLogger = (logLevel: string): winston.Logger => {
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      return `[${String(info.timestamp)}] [${String(info.level)}] ${String(info.message)}`;
    })
  );

  return winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports: [
      new winston.transports.Console({
        level: logLevel,
        stderrLevels: ['error', 'warn', 'info', 'debug'],
      }),
    ],
  });
};
