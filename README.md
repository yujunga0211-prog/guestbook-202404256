# 미니 방명록 (guestbook-202404256)

회원가입이나 로그인 없이 이름과 메시지를 남기고, 글을 쓸 때 정한 비밀번호로만 내 글을 수정·삭제할 수 있는 미니 방명록입니다.

- **개발자**: 유정아 (학번 202404256)
- **배포 주소**: https://guestbook-202404256.vercel.app

## 기능

| 기능 | 설명 |
|---|---|
| 작성 | 누구나 이름, 메시지, 비밀번호를 입력해 글을 남길 수 있습니다. |
| 조회 | 누구나 전체 글 목록을 볼 수 있습니다. 최신 작성순으로 정렬되며 이름, 메시지, 작성 시각(한국 시간)이 표시됩니다. |
| 수정 | 글의 "수정"을 누르고 비밀번호를 입력하면 메시지를 고칠 수 있습니다. 수정된 글에는 "수정됨"이 표시됩니다. |
| 삭제 | 글의 "삭제"를 누르고 비밀번호를 입력하면 글이 지워집니다. |
| 비밀번호 확인 | 수정·삭제 때 비밀번호가 틀리면 요청이 거부되고, 그 글 아래에 "비밀번호가 일치하지 않습니다"가 표시됩니다. |

### 입력 규칙

- 이름 1~20자, 메시지 1~500자 (앞뒤 공백은 지운 뒤 확인)
- 비밀번호 4~50자 (공백까지 그대로 비교)
- 빈 값이나 길이 초과는 입력칸 아래에 안내가 표시되고, 입력한 내용은 그대로 남습니다.

### 보안

- 비밀번호는 평문으로 저장하지 않고 Node 내장 `scrypt`로 만든 해시만 저장합니다.
- 비밀번호 확인은 항상 서버에서 하며, 글 목록에는 비밀번호 해시가 포함되지 않습니다.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, Server Actions) + TypeScript
- **데이터베이스**: Neon Postgres (`@neondatabase/serverless`, ORM 없이 SQL 직접 작성)
- **스타일**: Tailwind CSS
- **테스트**: Vitest + PGlite (메모리에서 동작하는 Postgres)
- **배포**: Vercel

## 개발 과정 (SDD, Matt Pocock's Skills)

| 단계 | 스킬 | 결과물 |
|---|---|---|
| 1 | `/grill-with-docs` | 용어집 [CONTEXT.md](CONTEXT.md), 결정 기록 [docs/adr/](docs/adr/) |
| 2 | `/to-spec` | 스펙 [Issue #1](https://github.com/yujunga0211-prog/guestbook-202404256/issues/1) |
| 3 | `/to-tickets` | 티켓 [#2 글 작성과 목록](https://github.com/yujunga0211-prog/guestbook-202404256/issues/2), [#3 수정](https://github.com/yujunga0211-prog/guestbook-202404256/issues/3), [#4 삭제](https://github.com/yujunga0211-prog/guestbook-202404256/issues/4) |
| 4 | `/implement` | 테스트를 먼저 쓰고 구현 (통합 테스트 17개) |
| 5 | `/code-review` | 코드 규칙(Standards)과 스펙 부합(Spec) 두 관점으로 리뷰하고, 지적 사항을 반영 |

### 결정 기록 (ADR)

- [ADR-0001](docs/adr/0001-per-entry-password-hashed.md): 계정 없이 글마다 비밀번호를 두고 scrypt 해시로 저장한다.
- [ADR-0002](docs/adr/0002-schema-bootstrapped-by-app.md): 테이블은 앱이 처음 DB를 쓸 때 자동으로 만든다. 별도 마이그레이션 명령이 없다.

## 로컬에서 실행하기

1. 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. 프로젝트 루트에 `.env.local`을 만들고 Neon 연결 문자열을 넣습니다.

   ```
   DATABASE_URL=postgresql://...
   ```

3. 개발 서버를 실행하고 http://localhost:3000 에 접속합니다. 테이블은 첫 접속 때 자동으로 만들어집니다.

   ```bash
   npm run dev
   ```

## 테스트

```bash
npm test          # 통합 테스트 (DB 연결 없이 PGlite로 실행)
npm run typecheck # 타입 검사
npm run lint      # 린트
```
