
# AI 채팅(MCP Host & Client) 프로젝트 규칙

## 목표 (GOAL)

* 깔끔하고 단순하며, 읽기 쉽고 모듈화된 코드를 작성한다.
* 요구된 범위(MVP)**만 정확히 구현한다
* 시니어 개발자처럼 **성능/보안/확장성**을 먼저 고민한다.

---

## 개발 환경 (DEVELOPMENT ENVIRONMENT)

* 의존성 설치: `pnpm install`
* 개발 서버 실행: `pnpm dev`
* 형식/품질:

  * 타입 체크: `pnpm typecheck`
  * 린트/포맷: `pnpm lint && pnpm format`
* 테스트 실행: `pnpm test`
* 환경 변수: `.env.local` (예: `GEMINI_API_KEY`, `LLM_MODEL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

> 권장 Node 버전: LTS
> 패키지 매니저: `pnpm` 고정

---

## 프레임워크 규칙 (FRAMEWORK)

* **Next.js(App Router, /app)** 단일 프레임워크로 FE/BE 통합.
* 서버 로직은 **API Route**로 구현.
* 스트리밍 응답은 **Route Handler(SSE)**로 제공 가능: `/api/chat/stream`.
* 상태 관리: **필요 최소화**(React state + 간단 훅). 전역 스토어는 신중히 도입.

---

## UI 규칙 (UI COMPONENTS)

* UI 컴포넌트: **shadcn/ui**
* 스타일링: **Tailwind CSS**
* 아이콘: **Lucide**
* 레이아웃 원칙:

  * 상단: 모델/서버 관리 진입
  * 본문: 채팅 타임라인(유저/AI 버블 + MCP 결과 카드)
  * 하단: 입력창(텍스트, 전송 버튼, **“/”는 Prompt 전용 힌트**)
* 접근성: 시맨틱 마크업, 키보드 네비게이션, 명확한 로딩/에러 상태

---

## LLM & 스트리밍 (LLM & STREAMING)

* 기본 LLM: **Gemini API** (확장: Claude 등은 어댑터 추가로 대응)
* 호출 위치: **서버 사이드 전용**(Route Handler). 클라이언트 직접 호출 금지.
* 스트리밍: SSE로 토큰/청크 단위 표시, **취소(AbortController)** 지원.
* 에러 매핑: 401/403/429/5xx → 통일된 에러 코드/메시지로 변환.

---

## 저장소 (STORAGE)

* **Supabase Postgres + Auth** 사용

  * 채팅 세션/메시지: `chat_sessions` (RLS, 사용자별 분리)
  * MCP 서버 설정: `mcp_servers` (env/headers 포함 — 클라우드 저장 주의)
  * MCP live session 매핑: `mcp_live_sessions`
  * 최초 접속 시 localStorage 데이터 1회 자동 import (`user_settings.local_storage_migrated_at`)
* MCP **실제 연결**은 서버 메모리 레지스트리에 유지 (휘발)
* 마이그레이션 SQL: `supabase/migrations/`

---

## 인증 & 보안 (AUTH & SECURITY)

* Supabase Auth **익명 자동 로그인** (앱 접속 시 `signInAnonymously`, RLS용 `user_id` 발급)
* DB 접근: **RLS** (`auth.uid() = user_id`)
* 키 보관: **`.env.local`** (리포지토리에 커밋 금지)
* HTTPS 권장, CORS 화이트리스트 구성(필요 시)
* 로깅: 민감필드 마스킹, 에러 샘플링
* 클라이언트에서 외부 API(Gemini, MCP) **직접 호출 금지** → 서버 사이드 프록시/액션만 사용

---

## 호스팅 & 인프라 (HOSTING & INFRA)

* 배포: **Vercel** 권장(SSR/SSE 호환성 확인)

---

## 파일 길이 (FILE LENGTH)

* 모든 파일 **≤ 500 LOC**
* 단일 책임 원칙(SRP). 공용 유틸/훅/컴포넌트로 분리

---

## UI 디자인 원칙 (UI DESIGN PRINCIPLES)

* 단순·깔끔·미니멀, 정보 위계 명확
* **스트리밍 체감**을 최우선(빠른 첫 청크, 명확한 로딩 표시)
* 오류는 **친절한 문구 + 재시도 버튼**으로

---

## 데이터 변경 (DATA CHANGES)

* **AI는 DB 변경 권한 없음**
* 모든 변경은 사용자가 수행
* 현재 MVP는 서버 DB 미사용. 저장/이관 제안은 가능하되 **직접 실행 금지**

---

## 출력 스타일 (OUTPUT STYLE)

* 짧고 명확한 문장
* 충분한 맥락과 근거(가정/제약 포함)
* 결론을 먼저, 대안/트레이드오프를 뒤에
