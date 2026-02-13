import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logMetrics } from '@aws-lambda-powertools/metrics';
import { logger, tracer, metrics } from '../utils/observability-tools';

/**
 * Returns an array of Powertools middleware to be used in .use()
 * This restores the "One line of code" simplicity.
 */
export const observabilityMiddleware = (): middy.MiddlewareObj<any, any>[] => {
    return [
        // 1. Logger: Injects context (Request ID) & logs the incoming event
        injectLambdaContext(logger, { logEvent: true }),
        
        // 2. Metrics: Handles flushing metrics to CloudWatch & cold starts
        logMetrics(metrics, { captureColdStartMetric: true }),
        
        // 3. Tracer: Auto-captures the handler segment for X-Ray
        captureLambdaHandler(tracer)
    ];
};