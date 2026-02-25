import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { Decimal } from "@prisma/client/runtime/library";

const exchSchema = z.object({
  idName: z.string().max(15),
  partyCode: z.string().max(6),
  shortCode: z.string().max(8),
  rate: z.number().or(z.instanceof(Decimal)),
  idComm: z.number().or(z.instanceof(Decimal)),
  idAc: z.string().max(6),
  currency: z.enum(["PAISA", "RUPEE"]).default("PAISA"),
  template: z.string().optional().nullable(),
});

export const exchRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.exch.findMany({
      include: {
        party: true,
        idAcParty: true,
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
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const skip = (page - 1) * pageSize;
      const where = search
        ? {
            OR: [
              { idName: { contains: search, mode: "insensitive" as const } },
              { shortCode: { contains: search, mode: "insensitive" as const } },
              { partyCode: { contains: search, mode: "insensitive" as const } },
              { idAc: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};
      const [items, total] = await Promise.all([
        ctx.prisma.exch.findMany({
          where,
          skip,
          take: pageSize,
          include: { party: true, idAcParty: true },
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.exch.count({ where }),
      ]);
      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.exch.findUnique({
        where: { id: input.id },
        include: {
          party: true,
          idAcParty: true,
        },
      });
    }),

  create: adminProcedure
    .input(exchSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.exch.create({
        data: {
          idName: input.idName,
          partyCode: input.partyCode,
          shortCode: input.shortCode,
          rate: input.currency === "RUPEE" ? Number(input.rate) * 100 : input.rate,
          idComm: input.idComm,
          idAc: input.idAc,
          currency: input.currency,
          template: input.template ?? null,
        },
        include: {
          party: true,
          idAcParty: true,
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: exchSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.exch.update({
        where: { id: input.id },
        data: {
          ...input.data,
          rate: input.data.currency === "RUPEE" ? Number(input.data.rate) * 100 : input.data.rate,
        },
        include: {
          party: true,
          idAcParty: true,
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.exch.delete({
        where: { id: input.id },
      });
    }),
});
