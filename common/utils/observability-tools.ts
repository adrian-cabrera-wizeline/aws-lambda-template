import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics,MetricUnits } from '@aws-lambda-powertools/metrics';

const serviceName = process.env.POWERTOOLS_SERVICE_NAME || 'inventory-system';
const isOffline = process.env.IS_OFFLINE === 'true';

export const logger = new Logger({
    serviceName,
    logLevel: (process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL') || 'INFO',
    persistentLogAttributes: {
        env: process.env.NODE_ENV || 'dev',
    },
});

export const tracer = new Tracer({
    serviceName,
    enabled: !isOffline,
    captureHTTPsRequests: !isOffline,
});

export const metrics = new Metrics({
    namespace: 'InventoryNamespace',
    serviceName,
});

export { MetricUnits }