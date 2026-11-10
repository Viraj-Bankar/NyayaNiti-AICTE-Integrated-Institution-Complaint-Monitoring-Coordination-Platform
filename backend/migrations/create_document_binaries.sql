-- =============================================================================
-- NyayaNiti — Zero-Cost Persistent Document Storage Migration
-- Script: create_document_binaries.sql
-- Target: PostgreSQL (Neon Serverless / Local PostgreSQL / SQLite compatible DDL)
-- Safety: Non-destructive, Additive Only, Idempotent
-- =============================================================================
--
-- PURPOSE:
-- Creates the `document_binaries` table and supporting indexes to enable zero-cost
-- document and evidence storage directly inside PostgreSQL using the BYTEA type.
--
-- GUARANTEES:
-- 1. Non-destructive: Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
-- 2. No data loss: Does not modify, alter, or drop `document_metadata` or any Phase 1-8 table.
-- 3. Evidence Retention: Enforces `ON DELETE RESTRICT` on foreign key to prevent accidental
--    deletion of underlying binary data while document metadata remains.
-- 4. Idempotent: Can be safely executed multiple times without error or duplication.
-- =============================================================================

-- Step 1: Create the document_binaries table
CREATE TABLE IF NOT EXISTS document_binaries (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES document_metadata(id) ON DELETE RESTRICT,
    content BYTEA NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Step 2: Create unique index on document_id (1:1 mapping with exact SQLAlchemy parity name)
CREATE UNIQUE INDEX IF NOT EXISTS ix_document_binaries_document_id
    ON document_binaries (document_id);

-- Step 3: Create index on created_at for chronological audit filtering (exact SQLAlchemy parity name)
CREATE INDEX IF NOT EXISTS ix_document_binaries_created_at
    ON document_binaries (created_at);

-- =============================================================================
-- VERIFICATION QUERIES (Optional execution by DBA after migration)
-- =============================================================================
-- 1. Verify table existence and column structure:
--    SELECT column_name, data_type, is_nullable
--    FROM information_schema.columns
--    WHERE table_name = 'document_binaries'
--    ORDER BY ordinal_position;
--
-- 2. Verify indexes:
--    SELECT indexname, indexdef
--    FROM pg_indexes
--    WHERE tablename = 'document_binaries';
--
-- 3. Verify zero orphan records:
--    SELECT COUNT(*) FROM document_binaries
--    WHERE document_id NOT IN (SELECT id FROM document_metadata);
-- =============================================================================

