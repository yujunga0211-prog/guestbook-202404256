"use client";

import { useActionState } from "react";
import { createEntryAction } from "./actions";
import { AUTHOR_NAME_MAX, MESSAGE_MAX, PASSWORD_MAX } from "@/lib/limits";
import { errorTextClass, inputClass, primaryButtonClass } from "./ui";

// 새 Entry 작성 폼. 검증은 서버(guestbook 모듈)가 하고, 실패하면 입력값을 되돌려 받아 채운다.
// 성공하면 key를 바꿔 폼을 비운다.
export function EntryForm() {
  const [state, formAction, pending] = useActionState(createEntryAction, null);
  const errors = state?.status === "error" ? state.errors : undefined;
  const values = state?.status === "error" ? state.values : undefined;
  const formKey = state?.status === "ok" ? state.submittedAt : "form";

  return (
    <form key={formKey} action={formAction} className="mt-4 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="이름" error={errors?.authorName}>
          <input
            name="authorName"
            defaultValue={values?.authorName}
            maxLength={AUTHOR_NAME_MAX}
            placeholder="이름"
            autoComplete="nickname"
            aria-invalid={errors?.authorName ? true : undefined}
            className={inputClass}
          />
        </Field>
        <Field label="비밀번호" hint="수정·삭제할 때 필요해요 (4자 이상)" error={errors?.password}>
          <input
            type="password"
            name="password"
            maxLength={PASSWORD_MAX}
            placeholder="비밀번호"
            autoComplete="new-password"
            aria-invalid={errors?.password ? true : undefined}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="메시지" error={errors?.message}>
        <textarea
          name="message"
          defaultValue={values?.message}
          maxLength={MESSAGE_MAX}
          rows={3}
          placeholder="따뜻한 한마디를 남겨 주세요"
          aria-invalid={errors?.message ? true : undefined}
          className={`${inputClass} resize-y`}
        />
      </Field>
      <button type="submit" disabled={pending} className={`${primaryButtonClass} self-end`}>
        {pending ? "남기는 중…" : "남기기"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {hint && <span className="ml-2 font-normal text-muted">{hint}</span>}
      </span>
      {children}
      {error && <span className={errorTextClass}>{error}</span>}
    </label>
  );
}
