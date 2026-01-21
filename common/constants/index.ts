export const ERROR_CODES = {
  VALIDATION_ERROR: "VAL_001",
  NOT_FOUND: "ERR_404",
  INTERNAL_SERVER_ERROR: "ERR_500",
  DB_CONNECTION_ERROR: "DB_001",
  MISSING_USER_ID: "AUTH_001"
} as const;

export const TABLE_NAMES = {
  AUDIT_LOGS: process.env.TABLE_AUDIT || 'Audit_Logs_Local',
  APP_CONFIGS: process.env.TABLE_CONFIG || 'App_Configs_Local'
} as const;