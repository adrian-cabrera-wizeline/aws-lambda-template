import oracledb from 'oracledb';

// Enable Thin Mode
try { oracledb.initOracleClient({ libDir: undefined }); } catch (e) {}

let pool: oracledb.Pool | null = null;

export const getOracleConnection = async () => {
    if (!pool) {
        const isOffline = process.env.IS_OFFLINE === 'true';
        
        const dbConfig = {
            user: process.env.ORACLE_USER || 'system',
            password: process.env.ORACLE_PASSWORD || 'oracle',
            // Switch: Local Docker vs Real Cloud
            connectString: isOffline 
                ? 'host.docker.internal:1521/XEPDB1' 
                : process.env.ORACLE_CONN_STRING,
            poolMin: 1,
            poolMax: 2
        };

        console.log(`🔌 Connecting to Oracle (${isOffline ? 'OFFLINE' : 'CLOUD'})...`);
        pool = await oracledb.createPool(dbConfig);
    }
    return pool.getConnection();
};