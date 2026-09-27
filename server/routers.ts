import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchRecentAptTrades, fetchTrendSeries } from "./realEstate";
import { z } from "zod";
import { fetchPlaceSignals } from "./places";
import { fetchKaptComplexInfo } from "./kapt";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  realEstate: router({
    recentTrades: publicProcedure
      .input(z.object({ region: z.enum(["seoul", "gyeonggi"]).default("seoul"), months: z.number().int().min(1).max(3).default(3), propertyType: z.enum(["all", "apartment", "villa"]).default("all"), periodYears: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10)]).default(1) }).optional())
      .query(({ input }) => fetchRecentAptTrades({ region: input?.region ?? "seoul", months: input?.months ?? 3, propertyType: input?.propertyType ?? "all", periodYears: input?.periodYears ?? 1 })),
    nearbySignals: publicProcedure
      .input(z.object({ lat: z.number(), lng: z.number() }))
      .query(({ input }) => fetchPlaceSignals(input.lat, input.lng)),
    trendSeries: publicProcedure
      .input(z.object({ region: z.enum(["seoul", "gyeonggi"]).default("seoul"), propertyType: z.enum(["apartment", "villa"]).default("apartment") }))
      .query(({ input }) => fetchTrendSeries(input)),
    complexInfo: publicProcedure
      .input(z.object({ candidates: z.array(z.object({ id: z.string(), apartmentName: z.string(), lawdCd: z.string(), neighborhood: z.string().optional(), jibun: z.string().optional(), propertyType: z.enum(["apartment", "villa"]).optional() })).max(3) }))
      .query(({ input }) => fetchKaptComplexInfo(input.candidates)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
