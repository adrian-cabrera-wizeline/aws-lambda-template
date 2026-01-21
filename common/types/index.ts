// Re-export specific models so they can be imported from @common/types if preferred
export * from '../models/product.schema';

export interface LambdaContext {
  awsRequestId: string;
  functionName: string;
  // Add other AWS context fields needed globally
}

export interface AuditLogItem {
  userId: string;
  action: string;
  resourceId: string;
  status: 'SUCCESS' | 'FAILURE' | 'NOT_FOUND';
  timestamp: string;
}