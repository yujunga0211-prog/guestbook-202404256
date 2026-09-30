import { beforeEach, describe, expect, it } from "vitest";
import { createGuestbook, type Guestbook } from "@/lib/guestbook";
import type { Sql } from "@/lib/db";
import { createTestSql } from "@/test/pglite-sql";

let sql: Sql;
let guestbook: Guestbook;

beforeEach(() => {
  // 테스트마다 빈 DB. 테이블은 모듈이 첫 사용 때 만든다(ADR-0002).
  sql = createTestSql();
  guestbook = createGuestbook(sql);
});

async function write(authorName: string, message: string, password = "pass1234") {
  const result = await guestbook.createEntry({ authorName, message, password });
  if (!result.ok) throw new Error(`expected Entry to be created: ${JSON.stringify(result)}`);
  return result.entryId;
}

describe("createEntry and listEntries", () => {
  it("lists nothing on an empty guestbook", async () => {
    expect(await guestbook.listEntries()).toEqual([]);
  });

  it("shows a new Entry with its Author Name, Message and creation time", async () => {
    const before = Date.now();
    const id = await write("유정아", "안녕하세요!\n반가워요");

    const [entry] = await guestbook.listEntries();
    expect(entry).toMatchObject({
      id,
      authorName: "유정아",
      message: "안녕하세요!\n반가워요",
      updatedAt: null,
    });
    expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("lists Entries newest first", async () => {
    await write("A", "첫 번째");
    await write("B", "두 번째");
    await write("C", "세 번째");
    expect((await guestbook.listEntries()).map((e) => e.message)).toEqual([
      "세 번째",
      "두 번째",
      "첫 번째",
    ]);
  });

  it("trims Author Name and Message but keeps the password as typed", async () => {
    const id = await write("  유정아  ", "  안녕  ", " pw 12 ");
    expect((await guestbook.listEntries())[0]).toMatchObject({ authorName: "유정아", message: "안녕" });
    expect(await guestbook.deleteEntry({ entryId: id, password: "pw 12" })).toEqual({
      ok: false,
      reason: "wrong_password",
    });
    expect(await guestbook.deleteEntry({ entryId: id, password: " pw 12 " })).toEqual({ ok: true });
  });

  it("rejects missing fields with a message per field and stores nothing", async () => {
    const result = await guestbook.createEntry({ authorName: "   ", message: "", password: "" });
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      errors: {
        authorName: "이름을 입력해 주세요.",
        message: "메시지를 입력해 주세요.",
        password: "비밀번호를 입력해 주세요.",
      },
    });
    expect(await guestbook.listEntries()).toEqual([]);
  });

  it("enforces the length limits", async () => {
    const result = await guestbook.createEntry({
      authorName: "가".repeat(21),
      message: "가".repeat(501),
      password: "123",
    });
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      errors: {
        authorName: "이름은 20자 이하로 입력해 주세요.",
        message: "메시지는 500자 이하로 입력해 주세요.",
        password: "비밀번호는 4~50자로 입력해 주세요.",
      },
    });

    const atLimit = await guestbook.createEntry({
      authorName: "가".repeat(20),
      message: "가".repeat(500),
      password: "1234",
    });
    expect(atLimit.ok).toBe(true);
  });

  it("never stores the password in plain text", async () => {
    await write("유정아", "안녕", "my-secret-pw");
    const rows = await sql`SELECT * FROM entries`;
    expect(JSON.stringify(rows)).not.toContain("my-secret-pw");
  });

  it("does not expose the password hash in the list", async () => {
    await write("유정아", "안녕");
    expect(Object.keys((await guestbook.listEntries())[0]).sort()).toEqual([
      "authorName",
      "createdAt",
      "id",
      "message",
      "updatedAt",
    ]);
  });
});

describe("updateMessage", () => {
  it("changes the Message and marks the Entry as edited when the password matches", async () => {
    const id = await write("유정아", "오타있음", "pass1234");

    expect(
      await guestbook.updateMessage({ entryId: id, message: "  오타 고침  ", password: "pass1234" }),
    ).toEqual({ ok: true });

    const [entry] = await guestbook.listEntries();
    expect(entry.message).toBe("오타 고침");
    expect(entry.updatedAt).toBeInstanceOf(Date);
  });

  it("refuses a wrong password and leaves the Message unchanged", async () => {
    const id = await write("유정아", "원래 글", "pass1234");

    expect(await guestbook.updateMessage({ entryId: id, message: "바꿔치기", password: "wrong" })).toEqual({
      ok: false,
      reason: "wrong_password",
    });
    expect((await guestbook.listEntries())[0]).toMatchObject({ message: "원래 글", updatedAt: null });
  });

  it("validates the new Message", async () => {
    const id = await write("유정아", "원래 글");
    expect(await guestbook.updateMessage({ entryId: id, message: "   ", password: "pass1234" })).toEqual({
      ok: false,
      reason: "invalid",
      errors: { message: "메시지를 입력해 주세요." },
    });
    expect(
      await guestbook.updateMessage({ entryId: id, message: "가".repeat(501), password: "pass1234" }),
    ).toEqual({
      ok: false,
      reason: "invalid",
      errors: { message: "메시지는 500자 이하로 입력해 주세요." },
    });
    expect((await guestbook.listEntries())[0].message).toBe("원래 글");
  });

  it("keeps the list order after editing an older Entry", async () => {
    const older = await write("A", "옛 글");
    await write("B", "새 글");
    await guestbook.updateMessage({ entryId: older, message: "옛 글 수정", password: "pass1234" });
    expect((await guestbook.listEntries()).map((e) => e.message)).toEqual(["새 글", "옛 글 수정"]);
  });

  it("reports not_found for a deleted, unknown or malformed Entry id", async () => {
    const id = await write("유정아", "곧 삭제");
    await guestbook.deleteEntry({ entryId: id, password: "pass1234" });

    for (const entryId of [id, "00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
      expect(await guestbook.updateMessage({ entryId, message: "수정", password: "pass1234" })).toEqual({
        ok: false,
        reason: "not_found",
      });
    }
  });
});

describe("deleteEntry", () => {
  it("removes the Entry when the password matches", async () => {
    const id = await write("유정아", "지울 글", "pass1234");
    await write("다른 사람", "남을 글");

    expect(await guestbook.deleteEntry({ entryId: id, password: "pass1234" })).toEqual({ ok: true });
    expect((await guestbook.listEntries()).map((e) => e.message)).toEqual(["남을 글"]);
  });

  it("refuses a wrong password and keeps the Entry", async () => {
    const id = await write("유정아", "지키는 글", "pass1234");

    expect(await guestbook.deleteEntry({ entryId: id, password: "pass12345" })).toEqual({
      ok: false,
      reason: "wrong_password",
    });
    expect((await guestbook.listEntries()).map((e) => e.message)).toEqual(["지키는 글"]);
  });

  it("does not accept another Entry's password", async () => {
    const mine = await write("나", "내 글", "mine-pw");
    await write("너", "네 글", "your-pw");
    expect(await guestbook.deleteEntry({ entryId: mine, password: "your-pw" })).toEqual({
      ok: false,
      reason: "wrong_password",
    });
  });

  it("reports not_found for an already deleted, unknown or malformed Entry id", async () => {
    const id = await write("유정아", "한 번만 지워짐");
    expect(await guestbook.deleteEntry({ entryId: id, password: "pass1234" })).toEqual({ ok: true });
    for (const entryId of [id, "00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
      expect(await guestbook.deleteEntry({ entryId, password: "pass1234" })).toEqual({
        ok: false,
        reason: "not_found",
      });
    }
  });
});
