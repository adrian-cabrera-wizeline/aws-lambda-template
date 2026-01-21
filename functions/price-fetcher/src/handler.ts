import { OracleRepo } from './repositoryOracle';
import { DynamoRepo } from './repositoryDynamo';
import { Product } from '@common/types';

export const processRequest = async (
  oracle: OracleRepo, 
  dynamo: DynamoRepo, 
  productId: string, 
  userId: string
): Promise<Product | null> => {
  
  // 1. Fetch
  const product = await oracle.getPrice(productId);
  const status = product ? 'SUCCESS' : 'NOT_FOUND';

  // 2. Audit (Using the shared Type interface)
  await dynamo.logAudit({
    userId,
    action: 'PRICE_FETCH',
    resourceId: productId,
    status,
    timestamp: new Date().toISOString()
  });

  return product;
};