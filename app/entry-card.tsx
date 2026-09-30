"use client";

import { useActionState, useState } from "react";
import { deleteEntryAction, updateMessageAction, type ChangeEntryState } from "./actions";
import { MESSAGE_MAX, PASSWORD_MAX } from "@/lib/limits";
import {
  cardClass,
  dangerButtonClass,
  errorTextClass,
  ghostButtonClass,
  inputClass,
  primaryButtonClass,
} from "./ui";

export type EntryCardProps = {
  id: string;
  authorName: string;
  message: string;
  createdLabel: string;
  edited: boolean;
};

type Mode = "view" | "edit" | "delete";

// Entry 한 개. "수정"/"삭제"를 누르면 그 자리에 Entry Password 입력 폼이 열린다.
// 비밀번호 확인은 서버가 하고, 틀리면 "비밀번호가 일치하지 않습니다"를 이 카드 안에 보여준다.
export function EntryCard({ id, authorName, message, createdLabel, edited }: EntryCardProps) {
  const [mode, setMode] = useState<Mode>("view");
  const [updateState, updateAction, updating] = useActionState(updateMessageAction.bind(null, id), null);
  const [deleteState, deleteAction, deleting] = useActionState(deleteEntryAction.bind(null, id), null);
  // 폼을 연 시점의 결과. 그 뒤에 새로 성공한 결과가 오면 폼을 닫는다(effect 없이 렌더링 중에 판단).
  const [openedWith, setOpenedWith] = useState<ChangeEntryState>(null);

  const updated = updateState?.status === "ok" && updateState !== openedWith;
  // 이번에 연 폼에서 실패했으면 입력했던 Message를 다시 채운다.
  const failedMessage =
    updateState?.status === "error" && updateState !== openedWith ? updateState.message : undefined;
  const visibleMode: Mode = mode === "edit" && updated ? "view" : mode;

  const open = (next: Mode) => {
    setOpenedWith(next === "edit" ? updateState : deleteState);
    setMode(next);
  };

  return (
    <li className={cardClass}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold break-words">{authorName}</p>
        <p className="shrink-0 text-xs text-muted tabular-nums">
          {createdLabel}
          {edited && <span className="ml-1.5">· 수정됨</span>}
        </p>
      </div>

      {visibleMode === "edit" ? (
        <form action={updateAction} className="mt-3 flex flex-col gap-3">
          <textarea
            name="message"
            defaultValue={failedMessage ?? message}
            maxLength={MESSAGE_MAX}
            rows={3}
            aria-label="수정할 메시지"
            className={`${inputClass} resize-y`}
          />
          <PasswordRow pending={updating} submitLabel="수정" onCancel={() => setMode("view")} />
          <ErrorLine state={updateState === openedWith ? null : updateState} />
        </form>
      ) : (
        <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{message}</p>
      )}

      {visibleMode === "delete" && (
        <form action={deleteAction} className="mt-3 flex flex-col gap-3 rounded-xl bg-background p-3">
          <p className="text-sm">이 글을 삭제할까요? 되돌릴 수 없어요.</p>
          <PasswordRow pending={deleting} submitLabel="삭제" danger onCancel={() => setMode("view")} />
          <ErrorLine state={deleteState === openedWith ? null : deleteState} />
        </form>
      )}

      {visibleMode === "view" && (
        <div className="mt-3 flex justify-end gap-1">
          <button type="button" onClick={() => open("edit")} className={ghostButtonClass}>
            수정
          </button>
          <button type="button" onClick={() => open("delete")} className={ghostButtonClass}>
            삭제
          </button>
        </div>
      )}
    </li>
  );
}

function PasswordRow({
  pending,
  submitLabel,
  danger,
  onCancel,
}: {
  pending: boolean;
  submitLabel: string;
  danger?: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="password"
        name="password"
        required
        autoFocus
        maxLength={PASSWORD_MAX}
        placeholder="작성할 때 정한 비밀번호"
        autoComplete="current-password"
        aria-label="비밀번호"
        className={`${inputClass} sm:flex-1`}
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className={ghostButtonClass}>
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className={danger ? dangerButtonClass : primaryButtonClass}
        >
          {pending ? "확인 중…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

function ErrorLine({ state }: { state: ChangeEntryState }) {
  if (state?.status !== "error") return null;
  return (
    <p role="alert" className={errorTextClass}>
      {state.error}
    </p>
  );
}
