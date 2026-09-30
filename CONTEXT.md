# Guestbook

로그인 없이 누구나 이름과 메시지를 남기고, 글을 쓸 때 정한 비밀번호로만 자기 글을 고치거나 지울 수 있는 미니 방명록.

## Language

**Entry**:
방명록에 남긴 글 하나. **Author Name**, **Message**, 작성 시각(`created_at`)과 **Entry Password**의 해시를 가진다. 목록은 최신 작성순이다.
_Avoid_: Post, 게시글, Comment, 댓글

**Author Name**:
Entry를 쓸 때 적는 이름(1~20자). 계정이 아니라 표시용 문자열이라 같은 이름이 여러 Entry에 있을 수 있고, 작성 후 바꿀 수 없다.
_Avoid_: User, 작성자 계정, Nickname

**Message**:
Entry의 본문(1~500자). Entry에서 유일하게 수정할 수 있는 부분이다. 수정하면 `updated_at`이 기록되고 화면에 "수정됨"이 표시된다.
_Avoid_: Content, Body, 내용

**Entry Password**:
Entry를 쓸 때 정하는 비밀번호(4~50자). 그 Entry를 수정·삭제할 권한의 유일한 근거이며, 평문이 아닌 해시로만 저장한다 ([ADR-0001](docs/adr/0001-per-entry-password-hashed.md)).
_Avoid_: 계정 비밀번호, PIN, Token

## 규칙

- 누구나 Entry를 쓰고, 전체 Entry 목록을 최신 작성순으로 볼 수 있다.
- Message 수정과 Entry 삭제는 Entry Password가 일치할 때만 된다. 틀리면 거부되고 "비밀번호가 일치하지 않습니다"가 그 Entry 옆에 표시된다.
- 삭제는 되돌릴 수 없다(실제로 행을 지운다).
- 이름·메시지는 앞뒤 공백을 지운 뒤 길이를 검사한다. 비밀번호는 공백 포함 그대로 비교한다.
- 시각은 한국 시간(Asia/Seoul)으로 표시한다.
- 화면에 개발자 이름(유정아)과 학번(202404256)을 표시한다.

## 범위 밖

회원가입·로그인, 관리자 기능, Author Name 수정, 비밀번호 찾기·변경, 페이지네이션, 스팸·무차별 대입 방지(rate limit), 답글, 좋아요, 이미지 첨부, 실시간 갱신.
