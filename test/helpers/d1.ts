// A minimal D1Database stand-in backed by node:sqlite, so Worker code can be
// tested against the real schema and real SQL without Cloudflare tooling.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

type Value = string | number | null | bigint | Uint8Array;

class Statement {
  readonly db: DatabaseSync;
  readonly sql: string;
  readonly params: Value[];
  constructor(db: DatabaseSync, sql: string, params: Value[] = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }
  bind(...params: unknown[]): Statement {
    return new Statement(this.db, this.sql, params.map((p) => (p === undefined ? null : typeof p === "boolean" ? Number(p) : (p as Value))));
  }
  private rows(): Record<string, unknown>[] {
    return this.db.prepare(this.sql).all(...(this.params as never[])) as Record<string, unknown>[];
  }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.rows()[0];
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: true; meta: Record<string, number> }> {
    return { results: this.rows() as T[], success: true, meta: {} };
  }
  async run(): Promise<{ results: never[]; success: true; meta: { changes: number; last_row_id: number } }> {
    if (/^\s*(SELECT|WITH)/i.test(this.sql)) {
      this.rows();
      return { results: [], success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    const r = this.db.prepare(this.sql).run(...(this.params as never[]));
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  async raw(): Promise<unknown[][]> {
    return this.rows().map((r) => Object.values(r));
  }
  // Used by batch().
  execute(): { results: unknown[]; success: true; meta: Record<string, number> } {
    if (/^\s*(SELECT|WITH)/i.test(this.sql)) return { results: this.rows(), success: true, meta: {} };
    const r = this.db.prepare(this.sql).run(...(this.params as never[]));
    return { results: [], success: true, meta: { changes: Number(r.changes) } };
  }
}

export class TestD1 {
  readonly db: DatabaseSync;
  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.db.exec("PRAGMA foreign_keys = ON;");
    const dir = join(import.meta.dirname, "..", "..", "migrations");
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) this.db.exec(readFileSync(join(dir, f), "utf8"));
  }
  prepare(sql: string): Statement {
    return new Statement(this.db, sql);
  }
  async batch(statements: Statement[]): Promise<unknown[]> {
    this.db.exec("BEGIN");
    try {
      const out = statements.map((s) => s.execute());
      this.db.exec("COMMIT");
      return out;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
}
