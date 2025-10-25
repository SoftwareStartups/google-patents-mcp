#!/usr/bin/env node
import { readFileSync } from 'fs';
import { GooglePatentsServer } from './server.js';
import { SerpApiClient } from './services/serpapi.js';
import { createLogger } from './logger.js';
import { getConfig } from './config.js';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
) as { version: string };

const config = getConfig();
const logger = createLogger(config.logLevel);

logger.info('=== Google Patents Server started ===');
logger.info('SERPAPI_API_KEY found.');

const flushLogs = () => {
  logger.debug('Flushing logs on process exit');
  try {
    logger.close();
  } catch {
    // Ignore errors during shutdown
  }
};

const setupProcessHandlers = () => {
  process.on('exit', flushLogs);

  process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down.');
    flushLogs();
    process.exit(0);
  });

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`);
    if (err.stack) {
      logger.error(err.stack);
    }
    flushLogs();
    process.exit(1);
  });
};

const main = async () => {
  setupProcessHandlers();

  const serpApiClient = new SerpApiClient(config.serpApiKey, logger);
  const server = new GooglePatentsServer(
    packageJson.version,
    logger,
    serpApiClient
  );

  await server.run();
};

main().catch((err) => {
  logger.error('Failed to start server:', err);
  logger.debug(
    `Server start failure details: ${err instanceof Error ? err.stack : String(err)}`
  );
  process.exit(1);
});
