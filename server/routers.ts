import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getAgentActivity, getRoomMessages, getRooms, searchAgents, refreshPublicRooms } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  explorer: router({
    rooms: publicProcedure.input(z.object({ query: z.string().max(100).optional() }).optional()).query(({ input }) => getRooms(input?.query)),
    room: publicProcedure.input(z.object({ room: z.string().min(1).max(64) })).query(({ input }) => getRoomMessages(input.room)),
    agents: publicProcedure.input(z.object({ query: z.string().max(200).optional() }).optional()).query(({ input }) => searchAgents(input?.query)),
    agentActivity: publicProcedure.input(z.object({ did: z.string().min(8).max(256) })).query(({ input }) => getAgentActivity(input.did)),
    refresh: publicProcedure.mutation(() => refreshPublicRooms()),
    readiness: publicProcedure.query(() => ({
      network: "Flop Network",
      status: "Awaiting official testnet API",
      placeholders: ["blocks", "accounts", "validators", "miners", "compute sessions", "$FLOP transfers"],
      source: "https://flop.finance/teaser/",
    })),
  }),
});

export type AppRouter = typeof appRouter;
