// 프레임워크 비의존 tRPC 컨텍스트.
// 모든 프로시저가 publicProcedure이고 ctx를 사용하지 않는다.
export type TrpcContext = Record<string, unknown>;

export async function createContext(): Promise<TrpcContext> {
  return {};
}
