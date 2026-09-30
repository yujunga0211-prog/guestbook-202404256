# 테이블은 앱이 첫 DB 사용 때 `CREATE TABLE IF NOT EXISTS`로 만든다

별도 마이그레이션 명령을 배포 과정에 끼우지 않기 위해, guestbook 모듈이 프로세스마다 처음 DB를 쓸 때 스키마 SQL(`CREATE TABLE IF NOT EXISTS entries …`)을 한 번 실행한다. 새 Neon DB를 Vercel에 연결하고 배포만 하면 바로 동작하고, 테스트(PGlite)도 같은 SQL로 스키마를 만든다. 테이블이 하나뿐이고 멱등한 문장이라 가능한 선택이며, 스키마가 바뀌는 변경이 생기면 번호가 붙은 마이그레이션 파일 방식으로 바꿔야 한다. ORM은 쓰지 않는다(수업 스택: raw SQL).
