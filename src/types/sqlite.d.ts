/**
 * Type declarations for built-in Node.js SQLite module (node:sqlite)
 */
declare module "node:sqlite" {
  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface ColumnMetadata {
    name: string;
    column: string | null;
    table: string | null;
    database: string | null;
    type: string | null;
  }

  export interface StatementSync {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown | undefined;
    run(...params: unknown[]): RunResult;
    iterate(...params: unknown[]): IterableIterator<unknown>;
    columns(): ColumnMetadata[];
    setAllowBareNamedParameters(allow: boolean): void;
    setAllowUnknownNamedParameters(allow: boolean): void;
    setReadBigInts(readBigInts: boolean): void;
    setReturnArrays(returnArrays: boolean): void;
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    readonly location: string;
    open(): void;
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
