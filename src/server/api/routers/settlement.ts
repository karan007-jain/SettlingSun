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
          select: {
            id: true,
            settleId: true,
            exch: true,
            upline: true,
            filename: true,
            status: true,
            uploadedAt: true,
            recordCount: true,
            errorMsg: true,
            processedAt: true,
            settlementId: true,
          },
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
          uploads: {
            orderBy: { uploadedAt: "desc" },
            select: {
              id: true,
              settleId: true,
              exch: true,
              upline: true,
              filename: true,
              status: true,
              uploadedAt: true,
              recordCount: true,
              errorMsg: true,
              processedAt: true,
              settlementId: true,
            },
          },
        },
      });
    }),

  getUploads: protectedProcedure
    .input(z.object({ settleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.settlementUpload.findMany({
        where: { settleId: input.settleId },
        orderBy: { uploadedAt: "desc" },
        select: {
          id: true,
          settleId: true,
          exch: true,
          upline: true,
          filename: true,
          status: true,
          uploadedAt: true,
          recordCount: true,
          errorMsg: true,
          processedAt: true,
          settlementId: true,
        },
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
