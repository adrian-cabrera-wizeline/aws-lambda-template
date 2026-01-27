# Price Fetcher Service - User Journeys

This service manages the lifecycle of products using a **Dual-Write Architecture**. It maintains the *Current State* in Oracle (for transactional integrity) and an *Immutable History* in DynamoDB (for audit compliance).

## 1. Create Product (POST)
**Goal:** Initialize a new item in the inventory.

1.  **Request:** User sends `POST /product` with `{ name, price }`.
2.  **Validation:**
    * `name` must be 3+ characters.
    * `price` must be positive.
3.  **Oracle Transaction:**
    * Generates a new UUID.
    * Inserts row into `PRODUCTS` table with status `ACTIVE`.
4.  **Audit Log:**
    * Writes a `CREATE` event to DynamoDB (`PK: PRODUCT#{UUID}`).
5.  **Response:** Returns `201 Created` with the generated `{ id }`.

---

## 2. Get Product (GET)
**Goal:** Retrieve the current live status of a product.

1.  **Request:** User sends `GET /product?id={UUID}`.
2.  **Oracle Query:**
    * Selects the row where `ID = {UUID}`.
3.  **Data Mapping:**
    * Maps Oracle columns (e.g., `UPDATED_AT`) to JSON camelCase (`updatedAt`).
4.  **Response:**
    * If found: Returns `200 OK` with product details.
    * If missing: Returns `404 Not Found`.

---

## 3. Update Price (PUT)
**Goal:** Change the price and record the history of the change.

1.  **Request:** User sends `PUT /product` with `{ id, price }`.
2.  **Pre-Flight Check:**
    * Fetches the product from Oracle to verify it exists and get the *old price*.
3.  **Oracle Update:**
    * Updates `PRICE` column and sets `UPDATED_AT = SYSDATE`.
4.  **Audit Log:**
    * Writes an `UPDATE` event to DynamoDB.
    * **Payload:** Includes both `oldPrice` and `newPrice` for diffing.
5.  **Response:** Returns `200 OK`.

---

## 4. Recall Product (DELETE)
**Goal:** Soft-delete a product for compliance/safety reasons.

1.  **Request:** User sends `DELETE /product?id={UUID}`.
2.  **Oracle Update (Soft Delete):**
    * Does **NOT** remove the row.
    * Updates `STATUS` to `INACTIVE`.
3.  **Audit Log:**
    * Writes a `DEACTIVATE` event to DynamoDB.
    * **Payload:** Includes the reason ("Manual API Recall").
4.  **Response:** Returns `200 OK` confirming status is now `inactive`.

---