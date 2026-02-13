import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Connection } from 'oracledb';
import { getOracleConnection } from '../utils/oracle-client';
import { logger } from '../utils/observability-tools'; // Correct import

// TYPE DEFINITION: Extend the default Lambda Context
declare module 'aws-lambda' {
  export interface Context {
    db?: Connection; // Adds 'db' to the global Context type
  }
}

export const oracleMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  return {
    // Open Connection & Attach to Context
    before: async (request) => {
      logger.debug("DB Middleware: Acquiring connection");
      try {
        const conn = await getOracleConnection();
        // Attach to the context so the Handler can access it
        request.context.db = conn;
      } catch (error) {
        logger.error("DB Middleware: Failed to acquire connection", { error: error as Error });
        throw error; // Fail fast - do not proceed to handler
      }
    },

    // Close Connection (Success Path)
    after: async (request) => {
      const conn = request.context.db;
      if (conn) {
        try {
          await conn.close();
          logger.debug("DB Middleware: Connection closed");
        } catch (error) {
          logger.warn("DB Middleware: Error closing connection", { error: error as Error });
        }
      }
    },

    // Close Connection (Failure Path)
    onError: async (request) => {
      const conn = request.context.db;
      if (conn) {
        try {
          await conn.close();
          logger.debug("DB Middleware: Connection closed (Error Handler)");
        } catch (error) {
          logger.error("DB Middleware: Critical fail closing connection", { error: error as Error });
        }
      }
    }
  };
};