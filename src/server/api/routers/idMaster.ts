import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { Decimal } from "@prisma/client/runtime/library";

const idMasterSchema = z.object({
  userId: z.string().max(15),
  partyCode: z.string().max(6),
  idCode: z.string(),
  credit: z.number().or(z.instanceof(Decimal)).default(0),
  comm: z.number().or(z.instanceof(Decimal)),
  rate: z.number().or(z.instanceof(Decimal)),
  pati: z.number().or(z.instanceof(Decimal)).optional().nullable(),
  partner: z.string().max(6).optional().nullable(),
  active: z.boolean().default(true),
  isUpline: z.boolean().default(false),
  uplineId: z.string().max(15).optional().nullable(),
});

export const idMasterRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.idMaster.findMany({
      include: {
        party: true,
        exch: true,
        partnerParty: true,
        upline: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getList: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        filterActive: z.boolean().optional(),
        filterIsUpline: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, filterActive, filterIsUpline } = input;
      const skip = (page - 1) * pageSize;
      const where: Record<string, unknown> = {};
      if (filterActive !== undefined) where.active = filterActive;
      if (filterIsUpline !== undefined) where.isUpline = filterIsUpline;
      if (search) {
        where.OR = [
          { userId: { contains: search, mode: "insensitive" } },
          { partyCode: { contains: search, mode: "insensitive" } },
          { idCode: { contains: search, mode: "insensitive" } },
          { uplineId: { contains: search, mode: "insensitive" } },
        ];
      }
      const [items, total] = await Promise.all([
        ctx.prisma.idMaster.findMany({
          where,
          skip,
          take: pageSize,
          include: { party: true, exch: true, partnerParty: true, upline: true },
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.idMaster.count({ where }),
      ]);
      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  getUplines: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.idMaster.findMany({
      where: { isUpline: true },
      select: {
        userId: true,
        id: true,
      },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.idMaster.findUnique({
        where: { id: input.id },
        include: {
          party: true,
          exch: true,
          partnerParty: true,
          upline: true,
        },
      });
    }),

  create: protectedProcedure
    .input(idMasterSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.idMaster.create({
        data: {
          userId: input.userId,
          partyCode: input.partyCode,
          idCode: input.idCode,
          credit: input.credit,
          comm: input.comm,
          rate: input.rate,
          pati: input.pati,
          partner: input.partner,
          active: input.active,
          isUpline: input.isUpline,
          uplineId: input.uplineId,
        },
        include: {
          party: true,
          exch: true,
          partnerParty: true,
          upline: true,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: idMasterSchema.partial().omit({ userId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.idMaster.update({
        where: { id: input.id },
        data: input.data,
        include: {
          party: true,
          exch: true,
          partnerParty: true,
          upline: true,
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.idMaster.delete({
        where: { id: input.id },
      });
    }),
});
