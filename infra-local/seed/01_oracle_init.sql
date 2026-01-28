-- Switch to the Pluggable Database (Standard for XE images)
ALTER SESSION SET CONTAINER=FREEPDB1;

-- Create the User (Matches docker-compose.yml)
-- Note: We use "CREATE USER IF NOT EXISTS" logic by wrapping in a block or just ignoring error
-- But for a clean seed, standard creation is fine.
BEGIN
  EXECUTE IMMEDIATE 'CREATE USER app_user IDENTIFIED BY "password"';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -01920 THEN -- Ignore "User already exists" error
      RAISE;
    END IF;
END;
/

-- Grant Permissions
GRANT CONNECT, RESOURCE TO app_user;
ALTER USER app_user QUOTA UNLIMITED ON USERS;

-- Clean up old table if it exists (Idempotency)
BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE app_user.products PURGE';
EXCEPTION
   WHEN OTHERS THEN NULL;
END;
/

-- Create the New Table (Supports Soft Deletes)
CREATE TABLE app_user.products (
    id VARCHAR2(50) PRIMARY KEY,
    name VARCHAR2(150) NOT NULL, 
    price NUMBER(10, 2) NOT NULL,  
    status VARCHAR2(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DELETED')), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Seed Data
-- An Active Product (For Read/Update tests)
INSERT INTO app_user.products (id, name, price, status) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Big freezer', 99999.99, 'ACTIVE');

-- A "Deleted" Product (For 404/Soft-Delete verification)
INSERT INTO app_user.products (id, name, price, status) 
VALUES ('deleted-uuid-0000-0000-000000000000', 'Old Discontinued Item', 10000.00, 'DELETED');

COMMIT;