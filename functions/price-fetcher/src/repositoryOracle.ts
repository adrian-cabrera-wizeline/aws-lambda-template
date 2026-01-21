import { Connection } from 'oracledb';
import { Product } from '@common/types'; // 👈 Imported from shared core

export class OracleRepo {
  constructor(private conn: Connection) {}

  async getPrice(productId: string): Promise<Product | null> {
    const sql = `SELECT price, currency FROM product_prices WHERE product_id = :id`;
    
    const result = await this.conn.execute(sql, [productId]);
    
    if (!result.rows || result.rows.length === 0) return null;
    
    const [price, currency] = result.rows[0] as [number, 'USD' | 'EUR'];
    
    // Return typed object matching our Model
    return { 
      productId, 
      price, 
      currency 
    };
  }
}