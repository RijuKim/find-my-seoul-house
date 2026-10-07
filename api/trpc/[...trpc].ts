import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

// Vercel 서버리스 함수 진입점.
// `server/routers.ts`의 tRPC 라우터를 그대로 재사용한다.
// `/api/trpc/<procedure>` 요청이 이 catch-all 함수로 매핑된다.
async function handler(request: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext,
  });
}

export const GET = handler;
export const POST = handler;
