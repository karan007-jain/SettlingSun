import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";

const partyMasterSchema = z.object({
  partyCode: z.string().max(6).toUpperCase(),
  partyName: z.string().max(15),
  ref: z.string().max(15).optional(),
});

export const partyMasterRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.partyMaster.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  getList: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const skip = (page - 1) * pageSize;
      const where = search
        ? {
            OR: [
              { partyCode: { contains: search, mode: "insensitive" as const } },
              { partyName: { contains: search, mode: "insensitive" as const } },
              { ref: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};
      const [items, total] = await Promise.all([
        ctx.prisma.partyMaster.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.partyMaster.count({ where }),
      ]);
      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  getById: protectedProcedure
    .input(z.object({ partyCode: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.partyMaster.findUnique({
        where: { partyCode: input.partyCode },
      });
    }),

  create: adminProcedure
    .input(partyMasterSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.partyMaster.create({
        data: {
          partyCode: input.partyCode.toUpperCase(),
          partyName: input.partyName,
          ref: input.ref,
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        partyCode: z.string(),
        data: partyMasterSchema.partial().omit({ partyCode: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.partyMaster.update({
        where: { partyCode: input.partyCode },
        data: input.data,
      });
    }),

  delete: adminProcedure
    .input(z.object({ partyCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.partyMaster.delete({
        where: { partyCode: input.partyCode },
      });
    }),
});
