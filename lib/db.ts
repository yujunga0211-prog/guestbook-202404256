import { neon } from "@neondatabase/serverless";

// SQL 태그 함수: 템플릿 값은 파라미터로 바인딩되고 결과는 행 배열이다.
// 앱은 Neon을, 테스트는 PGlite(test/pglite-sql.ts)를 같은 모양으로 넘긴다.
export type Sql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, unknown>[]>;

let appSql: Sql | undefined;

// 첫 사용 시 DATABASE_URL로 만든다(빌드 시점에 env가 없어도 import는 된다).
export function getSql(): Sql {
  if (!appSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const neonSql = neon(url);
    appSql = (strings, ...values) => neonSql(strings, ...values);
  }
  return appSql;
}
