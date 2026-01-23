import { Logger } from '@aws-lambda-powertools/logger'; // 👈 Removed LogLevel import
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics } from '@aws-lambda-powertools/metrics';

const serviceName = process.env.POWERTOOLS_SERVICE_NAME || 'inventory-system';
const isOffline = process.env.IS_OFFLINE === 'true';

// 1. LOGGER
export const logger = new Logger({
    serviceName,
    logLevel: (process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL') || 'INFO',
    persistentLogAttributes: {
        env: process.env.NODE_ENV || 'dev',
    },
});

// 2. TRACER
export const tracer = new Tracer({
    serviceName,
    enabled: !isOffline,
    captureHTTPsRequests: !isOffline,
});

// 3. METRICS
export const metrics = new Metrics({
    namespace: 'InventoryNamespace',
    serviceName,
});