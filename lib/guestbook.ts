import { getSql, type Sql } from "@/lib/db";
import { AUTHOR_NAME_MAX, MESSAGE_MAX, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/limits";
import { hashPassword, verifyPassword } from "@/lib/password";

// guestbook 도메인 모듈: Entry 규칙과 SQL은 모두 여기에 둔다. 페이지와 Server Action은 이 모듈만 부른다.

// 목록에 보이는 Entry. 비밀번호 해시는 일부러 넣지 않는다(ADR-0001).
export type Entry = {
  id: string;
  authorName: string;
  message: string;
  createdAt: Date;
  updatedAt: Date | null;
};
export type EntryErrors = { authorName?: string; message?: string; password?: string };
export type CreateEntryInput = { authorName: string; message: string; password: string };
export type CreateEntryResult =
  | { ok: true; entryId: string }
  | { ok: false; reason: "invalid"; errors: EntryErrors };
export type UpdateMessageInput = { entryId: string; message: string; password: string };
export type DeleteEntryInput = { entryId: string; password: string };
// 수정·삭제는 결과를 예외 대신 값으로 돌려준다. 화면은 reason별 안내를 보여준다.
export type ChangeEntryResult =
  | { ok: true }
  | { ok: false; reason: "wrong_password" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid"; errors: EntryErrors };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function messageError(message: string): string | undefined {
  if (message.length === 0) return "메시지를 입력해 주세요.";
  if (message.length > MESSAGE_MAX) return `메시지는 ${MESSAGE_MAX}자 이하로 입력해 주세요.`;
}

function validateEntry(authorName: string, message: string, password: string): EntryErrors | null {
  const errors: EntryErrors = {};
  if (authorName.length === 0) errors.authorName = "이름을 입력해 주세요.";
  else if (authorName.length > AUTHOR_NAME_MAX)
    errors.authorName = `이름은 ${AUTHOR_NAME_MAX}자 이하로 입력해 주세요.`;
  const msg = messageError(message);
  if (msg) errors.message = msg;
  // 비밀번호는 공백까지 그대로 비교하므로 trim하지 않는다.
  if (password.length === 0) errors.password = "비밀번호를 입력해 주세요.";
  else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    errors.password = `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력해 주세요.`;
  return Object.keys(errors).length > 0 ? errors : null;
}

// 권한 확인과 변경 사이에 다른 요청이 지웠으면 0행이 바뀐다.
const changedOrNotFound = (rows: unknown[]): ChangeEntryResult =>
  rows.length > 0 ? { ok: true } : { ok: false, reason: "not_found" };

const toDate = (value: unknown) => (value === null ? null : new Date(value as string | Date));

export function createGuestbook(sql: Sql) {
  // ADR-0002: 테이블은 첫 DB 사용 때 만든다. 인스턴스마다 한 번만 실행하고, 실패하면 다음 요청에서 다시 시도한다.
  let schemaReady: Promise<void> | undefined;
  // CHECK의 길이는 lib/limits.ts와 같아야 한다(DDL에는 파라미터를 쓸 수 없어 숫자로 적는다).
  // JS 검증(UTF-16 길이)이 char_length(코드 포인트)보다 엄격해서, JS를 통과한 값은 CHECK도 통과한다.
  function ensureSchema(): Promise<void> {
    schemaReady ??= (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS entries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 20),
          message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
          password_hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
          updated_at timestamptz
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS entries_created_at_idx ON entries (created_at DESC)`;
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
    return schemaReady;
  }

  async function listEntries(): Promise<Entry[]> {
    await ensureSchema();
    const rows = await sql`
      SELECT id, author_name, message, created_at, updated_at FROM entries
      ORDER BY created_at DESC, id DESC
    `;
    return rows.map((r) => ({
      id: r.id as string,
      authorName: r.author_name as string,
      message: r.message as string,
      createdAt: toDate(r.created_at)!,
      updatedAt: toDate(r.updated_at),
    }));
  }

  async function createEntry(input: CreateEntryInput): Promise<CreateEntryResult> {
    const authorName = input.authorName.trim();
    const message = input.message.trim();
    const errors = validateEntry(authorName, message, input.password);
    if (errors) return { ok: false, reason: "invalid", errors };

    await ensureSchema();
    const passwordHash = await hashPassword(input.password);
    const [row] = await sql`
      INSERT INTO entries (author_name, message, password_hash)
      VALUES (${authorName}, ${message}, ${passwordHash})
      RETURNING id
    `;
    return { ok: true, entryId: row.id as string };
  }

  // 비밀번호로 권한을 확인해 실패 이유를 돌려준다. 없는 Entry면 "not_found", 틀리면 "wrong_password", 통과하면 null.
  async function findPasswordFailure(entryId: string, password: string) {
    if (!UUID_PATTERN.test(entryId)) return "not_found" as const;
    await ensureSchema();
    const [row] = await sql`SELECT password_hash FROM entries WHERE id = ${entryId}`;
    if (!row) return "not_found" as const;
    if (!(await verifyPassword(password, row.password_hash as string))) return "wrong_password" as const;
    return null;
  }

  async function updateMessage(input: UpdateMessageInput): Promise<ChangeEntryResult> {
    const message = input.message.trim();
    const failure = await findPasswordFailure(input.entryId, input.password);
    if (failure) return { ok: false, reason: failure };
    const error = messageError(message);
    if (error) return { ok: false, reason: "invalid", errors: { message: error } };

    const rows = await sql`
      UPDATE entries SET message = ${message}, updated_at = now()
      WHERE id = ${input.entryId}
      RETURNING id
    `;
    return changedOrNotFound(rows);
  }

  async function deleteEntry(input: DeleteEntryInput): Promise<ChangeEntryResult> {
    const failure = await findPasswordFailure(input.entryId, input.password);
    if (failure) return { ok: false, reason: failure };
    const rows = await sql`DELETE FROM entries WHERE id = ${input.entryId} RETURNING id`;
    return changedOrNotFound(rows);
  }

  return { listEntries, createEntry, updateMessage, deleteEntry };
}

export type Guestbook = ReturnType<typeof createGuestbook>;

let appInstance: Guestbook | undefined;

// 앱(페이지·Server Action)이 쓰는 인스턴스. 스키마 확인이 프로세스당 한 번만 일어나도록 재사용한다.
export function appGuestbook(): Guestbook {
  appInstance ??= createGuestbook(getSql());
  return appInstance;
}
