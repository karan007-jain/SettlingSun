import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const settlementRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ settleId: z.string().min(1).toUpperCase() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.settlement.create({
        data: { settleId: input.settleId },
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.settlement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        uploads: {
          orderBy: { uploadedAt: "desc" },
          take: 5,
        },
        _count: { select: { uploads: true } },
      },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ settleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.settlement.findUnique({
        where: { settleId: input.settleId },
        include: {
          uploads: { orderBy: { uploadedAt: "desc" } },
        },
      });
    }),

  getUploads: protectedProcedure
    .input(z.object({ settleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.settlementUpload.findMany({
        where: { settleId: input.settleId },
        orderBy: { uploadedAt: "desc" },
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({ settleId: z.string(), status: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.settlement.update({
        where: { settleId: input.settleId },
        data: { status: input.status },
      });
    }),
});
