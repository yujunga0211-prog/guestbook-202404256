# 계정 없이 Entry마다 비밀번호를 두고, scrypt 해시로 저장한다

요구사항대로 회원가입 없이 Entry를 쓸 때 정한 Entry Password만으로 수정·삭제 권한을 확인한다. DB가 유출돼도 비밀번호가 드러나지 않도록 평문 대신 Node 내장 `crypto.scrypt`로 만든 `salt:hash`만 저장하고, 비교는 `timingSafeEqual`로 한다. bcrypt 같은 외부 패키지는 쓰지 않는다(네이티브 빌드 문제 없이 Vercel에서 동작).

## Consequences

- 비밀번호를 잊으면 그 Entry는 누구도 고치거나 지울 수 없다(관리자 기능 없음).
- 비밀번호 해시는 목록 조회 결과에 절대 포함하지 않는다. 검증은 수정·삭제 Server Action 안에서 서버가 한다.
- 무차별 대입(brute force) 방지는 하지 않는다. 알려진 위험이며 필요하면 rate limit을 추가한다.
