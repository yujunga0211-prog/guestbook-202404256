"use server";

import { revalidatePath } from "next/cache";
import { appGuestbook, type ChangeEntryResult, type EntryErrors } from "@/lib/guestbook";

// 폼 상태. 실패하면 입력값을 돌려줘 폼이 그대로 남게 한다. 비밀번호는 돌려주지 않는다.
export type CreateEntryState =
  | { status: "ok"; submittedAt: number }
  | { status: "error"; errors: EntryErrors; values: { authorName: string; message: string } }
  | null;

export type ChangeEntryState = { status: "ok" } | { status: "error"; error: string } | null;

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export async function createEntryAction(
  _prev: CreateEntryState,
  formData: FormData,
): Promise<CreateEntryState> {
  const values = { authorName: text(formData, "authorName"), message: text(formData, "message") };
  const result = await appGuestbook().createEntry({ ...values, password: text(formData, "password") });
  if (!result.ok) return { status: "error", errors: result.errors, values };
  revalidatePath("/");
  return { status: "ok", submittedAt: Date.now() };
}

// 수정·삭제 결과를 화면 안내 문구로 바꾼다. 비밀번호 불일치는 요구사항대로 반드시 알린다.
function toChangeState(result: ChangeEntryResult): ChangeEntryState {
  if (result.ok) {
    revalidatePath("/");
    return { status: "ok" };
  }
  if (result.reason === "wrong_password") return { status: "error", error: "비밀번호가 일치하지 않습니다." };
  if (result.reason === "not_found") {
    revalidatePath("/");
    return { status: "error", error: "이미 삭제된 글입니다." };
  }
  return { status: "error", error: result.errors.message ?? "입력값을 확인해 주세요." };
}

export async function updateMessageAction(
  entryId: string,
  _prev: ChangeEntryState,
  formData: FormData,
): Promise<ChangeEntryState> {
  return toChangeState(
    await appGuestbook().updateMessage({
      entryId,
      message: text(formData, "message"),
      password: text(formData, "password"),
    }),
  );
}

export async function deleteEntryAction(
  entryId: string,
  _prev: ChangeEntryState,
  formData: FormData,
): Promise<ChangeEntryState> {
  return toChangeState(await appGuestbook().deleteEntry({ entryId, password: text(formData, "password") }));
}
