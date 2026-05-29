export const WELCOME_TITLE = "AI 채팅에 오신 것을 환영합니다";
export const WELCOME_DESCRIPTION =
  "Gemini API와 연동된 AI 채팅입니다. 메시지를 내면 실시간으로 응답이 스트리밍됩니다.";

export const SUGGESTED_PROMPTS = [
  "안녕하세요!",
  "MCP가 뭐예요?",
  "Next.js 채팅 앱 구조를 알려줘",
  "오늘 할 일 추천해줘",
] as const;

const KEYWORD_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["안녕", "hello", "hi"],
    response:
      "안녕하세요! 저는 목업 AI 어시스턴트입니다. 실제 LLM API는 아직 연결되지 않았지만, 채팅 UI와 스트리밍 체감을 미리 확인할 수 있어요.",
  },
  {
    keywords: ["mcp"],
    response:
      "MCP(Model Context Protocol)는 AI 앱이 외부 도구·데이터 소스와 표준 방식으로 연결되게 하는 프로토콜입니다. 이 프로젝트에서는 MCP Host & Client 역할을 담당할 예정이에요.",
  },
  {
    keywords: ["next", "next.js", "구조", "아키텍처"],
    response:
      "이 앱은 Next.js App Router 기반입니다. UI는 클라이언트 컴포넌트, LLM 호출은 추후 `/api/chat/stream` 같은 Route Handler에서 서버 사이드로 처리할 계획입니다.",
  },
  {
    keywords: ["할 일", "todo", "추천"],
    response:
      "오늘 추천 할 일:\n1. 채팅 UI 목업 완성하기\n2. Gemini API Route Handler 연결\n3. MCP 서버 메타데이터 localStorage 저장\n4. 스트리밍 취소(AbortController) 지원",
  },
];

const DEFAULT_RESPONSE =
  "좋은 질문이에요! 현재는 목업 응답 모드라서, 입력하신 내용을 바탕으로 미리 준비된 답변을 보여드리고 있습니다. 실제 AI 응답은 API 연결 후 제공됩니다.";

export function getMockResponse(input: string): string {
  const normalized = input.toLowerCase().trim();

  for (const { keywords, response } of KEYWORD_RESPONSES) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return response;
    }
  }

  return DEFAULT_RESPONSE;
}
