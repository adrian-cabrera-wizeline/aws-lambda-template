ALTER SESSION SET CONTAINER=XEPDB1;
CREATE USER app_user IDENTIFIED BY "password";
GRANT CONNECT, RESOURCE TO app_user;
ALTER USER app_user QUOTA UNLIMITED ON USERS;

CREATE TABLE app_user.product_prices (
    product_id VARCHAR2(50) PRIMARY KEY,
    price NUMBER(10, 2),
    currency VARCHAR2(3)
);

INSERT INTO app_user.product_prices VALUES ('PROD-101', 99.99, 'USD');
COMMIT;