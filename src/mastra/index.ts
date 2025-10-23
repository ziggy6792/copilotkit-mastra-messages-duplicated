import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { canvasAgent } from './agents';
import { ConsoleLogger, LogLevel } from '@mastra/core/logger';
import { PostgresStore } from '@mastra/pg';

const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';

export const mastra = new Mastra({
  agents: {
    sample_agent: canvasAgent,
  },
  storage: new PostgresStore({
    connectionString: process.env.DB_CONNECTION_STRING!,
  }),

  logger: new ConsoleLogger({
    level: LOG_LEVEL,
  }),
});
