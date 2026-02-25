import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";

export const reportsRouter = createTRPCRouter({
  // Exchange-wise Reports
  getExchanges: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;
      
      const where = input.search
        ? {
            OR: [
              { idName: { contains: input.search, mode: "insensitive" as const } },
              { shortCode: { contains: input.search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [exchanges, total] = await Promise.all([
        ctx.prisma.exch.findMany({
          where,
          include: {
            party: true,
            idAcParty: true,
            _count: {
              select: {
                idMasters: true,
              },
            },
          },
          skip,
          take: input.pageSize,
          orderBy: { idName: "asc" },
        }),
        ctx.prisma.exch.count({ where }),
      ]);

      return {
        data: exchanges,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  getUplinesByExchange: protectedProcedure
    .input(
      z.object({
        exchangeIdNames: z.array(z.string()).min(1),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const where: any = {
        idCode: { in: input.exchangeIdNames },
        isUpline: true,
      };

      if (input.search) {
        where.userId = { contains: input.search, mode: "insensitive" as const };
      }

      const [uplines, total] = await Promise.all([
        ctx.prisma.idMaster.findMany({
          where,
          include: {
            party: true,
            exch: true,
            partnerParty: true,
            _count: {
              select: {
                downlines: true,
              },
            },
          },
          skip,
          take: input.pageSize,
          orderBy: { userId: "asc" },
        }),
        ctx.prisma.idMaster.count({ where }),
      ]);

      return {
        data: uplines,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  getDownlinesByUpline: protectedProcedure
    .input(
      z.object({
        uplineIds: z.array(z.string()).min(1),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const where: any = {
        uplineId: { in: input.uplineIds },
      };

      if (input.search) {
        where.userId = { contains: input.search, mode: "insensitive" as const };
      }

      const [downlines, total] = await Promise.all([
        ctx.prisma.idMaster.findMany({
          where,
          include: {
            party: true,
            exch: true,
            partnerParty: true,
            upline: true,
          },
          skip,
          take: input.pageSize,
          orderBy: { userId: "asc" },
        }),
        ctx.prisma.idMaster.count({ where }),
      ]);

      return {
        data: downlines,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  // Party-wise Reports
  getParties: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const where = input.search
        ? {
            OR: [
              { partyCode: { contains: input.search, mode: "insensitive" as const } },
              { partyName: { contains: input.search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [parties, total] = await Promise.all([
        ctx.prisma.partyMaster.findMany({
          where,
          include: {
            _count: {
              select: {
                idMasters: true,
              },
            },
          },
          skip,
          take: input.pageSize,
          orderBy: { partyName: "asc" },
        }),
        ctx.prisma.partyMaster.count({ where }),
      ]);

      return {
        data: parties,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  getIdMastersByParty: protectedProcedure
    .input(
      z.object({
        partyCodes: z.array(z.string()).min(1),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const where: any = {
        partyCode: { in: input.partyCodes },
      };

      if (input.search) {
        where.userId = { contains: input.search, mode: "insensitive" as const };
      }

      const [idMasters, total] = await Promise.all([
        ctx.prisma.idMaster.findMany({
          where,
          include: {
            party: true,
            exch: true,
            partnerParty: true,
            upline: true,
          },
          skip,
          take: input.pageSize,
          orderBy: { userId: "asc" },
        }),
        ctx.prisma.idMaster.count({ where }),
      ]);

      return {
        data: idMasters,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),
});
