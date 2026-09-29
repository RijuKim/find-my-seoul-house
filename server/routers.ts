import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  fetchRecentAptTrades,
  fetchTrendSeries,
  REGION_DISTRICTS,
} from "./realEstate";
import { z } from "zod";
import { fetchPlaceSignals } from "./places";
import { fetchKaptComplexInfo } from "./kapt";

export const appRouter = router({
  system: systemRouter,

  realEstate: router({
    districts: publicProcedure
      .input(
        z.object({ region: z.enum(["seoul", "gyeonggi"]).default("seoul") }),
      )
      .query(({ input }) =>
        REGION_DISTRICTS[input.region].map(({ lawdCd, district }) => ({
          lawdCd,
          district,
        })),
      ),
    recentTrades: publicProcedure
      .input(
        z
          .object({
            region: z.enum(["seoul", "gyeonggi"]).default("seoul"),
            months: z.number().int().min(1).max(12).default(1),
            propertyType: z
              .enum(["all", "apartment", "villa"])
              .default("all"),
            periodYears: z
              .union([
                z.literal(1),
                z.literal(3),
                z.literal(5),
                z.literal(10),
              ])
              .default(1),
          })
          .optional(),
      )
      .query(({ input }) =>
        fetchRecentAptTrades({
          region: input?.region ?? "seoul",
          months: input?.months ?? 1,
          propertyType: input?.propertyType ?? "all",
          periodYears: input?.periodYears ?? 1,
        }),
      ),
    nearbySignals: publicProcedure
      .input(z.object({ lat: z.number(), lng: z.number() }))
      .query(({ input }) => fetchPlaceSignals(input.lat, input.lng)),
    trendSeries: publicProcedure
      .input(
        z.object({
          region: z.enum(["seoul", "gyeonggi"]).default("seoul"),
          propertyType: z.enum(["apartment", "villa"]).default("apartment"),
        }),
      )
      .query(({ input }) => fetchTrendSeries(input)),
    complexInfo: publicProcedure
      .input(
        z.object({
          candidates: z
            .array(
              z.object({
                id: z.string(),
                apartmentName: z.string(),
                lawdCd: z.string(),
                neighborhood: z.string().optional(),
                jibun: z.string().optional(),
                propertyType: z.enum(["apartment", "villa"]).optional(),
              }),
            )
            .max(3),
        }),
      )
      .query(({ input }) => fetchKaptComplexInfo(input.candidates)),
  }),
});

export type AppRouter = typeof appRouter;
