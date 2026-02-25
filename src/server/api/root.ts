import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { authRouter } from "./routers/auth";
import { partyMasterRouter } from "./routers/partyMaster";
import { exchRouter } from "./routers/exch";
import { idMasterRouter } from "./routers/idMaster";
import { userRouter } from "./routers/user";
import { reportsRouter } from "./routers/reports";
import { syncRouter } from "./routers/sync";
import { settlementRouter } from "./routers/settlement";
import { processRouter } from "./routers/process";
import { configRouter } from "./routers/config";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  partyMaster: partyMasterRouter,
  exch: exchRouter,
  idMaster: idMasterRouter,
  user: userRouter,
  reports: reportsRouter,
  sync: syncRouter,
  settlement: settlementRouter,
  process: processRouter,
  config: configRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
