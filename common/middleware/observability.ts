import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logMetrics } from '@aws-lambda-powertools/metrics';
import { logger, tracer, metrics } from '../utils/observability-tools';

/**
 * A standard middleware bundle that adds all 3 observability pillars 
 * to any Lambda function in one line of code.
 */
export const withObservability = (handler: middy.MiddyfiedHandler) => {
    return handler
        .use(captureLambdaHandler(tracer))
        .use(logMetrics(metrics, { captureColdStartMetric: true }))
        .use(injectLambdaContext(logger, { logEvent: true }));
};