import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "@/lib/db";

// 테스트용 메모리 Postgres. guestbook 모듈에는 Neon과 같은 모양(태그 함수 → 행 배열)으로 넘긴다.
export function createTestSql(): Sql {
  const db = new PGlite();
  return async (strings, ...values) =>
    (await db.sql(strings, ...values)).rows as Record<string, unknown>[];
}
