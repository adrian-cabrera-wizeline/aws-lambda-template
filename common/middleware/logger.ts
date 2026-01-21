import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';

const serviceName = process.env.AWS_LAMBDA_FUNCTION_NAME || 'local-service';
const isLocal = process.env.AWS_SAM_LOCAL === 'true';

// 1. Logger: Structured JSON
export const logger = new Logger({ serviceName, logLevel: 'INFO' });

// 2. Metrics: FinOps (EMF format avoids API costs)
export const metrics = new Metrics({ namespace: 'CloudBackend', serviceName });

// 3. Tracer: FinOps (Disabled locally to save speed/cost)
export const tracer = new Tracer({ serviceName, enabled: !isLocal });