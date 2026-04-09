import Database from 'better-sqlite3';
import { join } from "path";

export const METADATA_KEYS = {
    DRIVE_CACHE: 'drive_cache',
} as const;

const DB_CONFIG = {
    FILENAME: 'cache.db',
    DEFAULT_TTL: 10 * 60 * 1000, // 10 Minutes
    PRAGMAS: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        cache_size: -2000, // 2MB
        foreign_keys: 'ON',
        temp_store: 'MEMORY',
    }
} as const;

export const db = new Database(join(process.cwd(), DB_CONFIG.FILENAME));

db.pragma(`journal_mode = ${DB_CONFIG.PRAGMAS.journal_mode}`);
db.pragma(`synchronous = ${DB_CONFIG.PRAGMAS.synchronous}`);
db.pragma(`cache_size = ${DB_CONFIG.PRAGMAS.cache_size}`);
db.pragma(`foreign_keys = ${DB_CONFIG.PRAGMAS.foreign_keys}`);
db.pragma(`temp_store = ${DB_CONFIG.PRAGMAS.temp_store}`);