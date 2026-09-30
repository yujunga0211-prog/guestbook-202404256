import { connection } from "next/server";
import { appGuestbook } from "@/lib/guestbook";
import { formatSeoulDateTime } from "@/lib/format";
import { EntryCard } from "./entry-card";
import { EntryForm } from "./entry-form";
import { cardClass } from "./ui";

export default async function Home() {
  // 새 Entry와 수정·삭제가 바로 보이도록 요청마다 렌더링한다.
  await connection();
  const entries = await appGuestbook().listEntries();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">방명록</h1>
      <p className="mt-2 text-muted">로그인 없이 한마디 남겨 주세요. 비밀번호로 내 글만 고치고 지울 수 있어요.</p>

      <section className={`${cardClass} mt-8`}>
        <h2 className="text-lg font-semibold">글 남기기</h2>
        <EntryForm />
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          남겨진 글
          <span className="rounded-full bg-line px-2 py-0.5 text-xs font-medium text-muted tabular-nums">
            {entries.length}
          </span>
        </h2>
        {entries.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-10 text-center text-muted">
            아직 남겨진 글이 없어요. 첫 글을 남겨 보세요!
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                id={entry.id}
                authorName={entry.authorName}
                message={entry.message}
                createdLabel={formatSeoulDateTime(entry.createdAt)}
                edited={entry.updatedAt !== null}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
