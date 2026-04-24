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
        sortBy: z
          .enum(["idName", "shortCode", "partyName", "rate", "idComm", "idCount"])
          .default("idName"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        hasIds: z.enum(["all", "yes", "no"]).default("all"),
        partyCode: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const where: any = {};
      const andConditions: any[] = [];

      if (input.search) {
        andConditions.push({
          OR: [
            { idName: { contains: input.search, mode: "insensitive" as const } },
            { shortCode: { contains: input.search, mode: "insensitive" as const } },
            { party: { partyName: { contains: input.search, mode: "insensitive" as const } } },
            { partyCode: { contains: input.search, mode: "insensitive" as const } },
          ],
        });
      }

      if (input.partyCode) {
        andConditions.push({
          partyCode: { contains: input.partyCode, mode: "insensitive" as const },
        });
      }

      if (input.hasIds === "yes") {
        andConditions.push({ idMasters: { some: {} } });
      } else if (input.hasIds === "no") {
        andConditions.push({ idMasters: { none: {} } });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const sortOrder = input.sortOrder;
      const orderBy =
        input.sortBy === "idName"
          ? { idName: sortOrder }
          : input.sortBy === "shortCode"
          ? { shortCode: sortOrder }
          : input.sortBy === "partyName"
          ? { party: { partyName: sortOrder } }
          : input.sortBy === "rate"
          ? { rate: sortOrder }
          : input.sortBy === "idComm"
          ? { idComm: sortOrder }
          : { idMasters: { _count: sortOrder } };

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
          orderBy,
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
        sortBy: z
          .enum(["userId", "partyName", "exchange", "credit", "comm", "rate", "active", "downlines"])
          .default("userId"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        active: z.enum(["all", "active", "inactive"]).default("all"),
        hasPartner: z.enum(["all", "yes", "no"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const where: any = {
        idCode: { in: input.exchangeIdNames },
        isUpline: true,
      };
      const andConditions: any[] = [];

      if (input.search) {
        andConditions.push({
          OR: [
          { userId: { contains: input.search, mode: "insensitive" as const } },
          { party: { partyName: { contains: input.search, mode: "insensitive" as const } } },
          { idCode: { contains: input.search, mode: "insensitive" as const } },
          ],
        });
      }

      if (input.active === "active") {
        where.active = true;
      } else if (input.active === "inactive") {
        where.active = false;
      }

      if (input.hasPartner === "yes") {
        where.partner = { not: null };
      } else if (input.hasPartner === "no") {
        andConditions.push({ OR: [{ partner: null }, { partner: "" }] });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const sortOrder = input.sortOrder;
      const orderBy =
        input.sortBy === "userId"
          ? { userId: sortOrder }
          : input.sortBy === "partyName"
          ? { party: { partyName: sortOrder } }
          : input.sortBy === "exchange"
          ? { exch: { idName: sortOrder } }
          : input.sortBy === "credit"
          ? { credit: sortOrder }
          : input.sortBy === "comm"
          ? { comm: sortOrder }
          : input.sortBy === "rate"
          ? { rate: sortOrder }
          : input.sortBy === "active"
          ? { active: sortOrder }
          : { downlines: { _count: sortOrder } };

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
          orderBy,
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
        sortBy: z
          .enum(["userId", "uplineId", "partyName", "exchange", "credit", "comm", "rate", "partner", "active"])
          .default("userId"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        active: z.enum(["all", "active", "inactive"]).default("all"),
        hasPartner: z.enum(["all", "yes", "no"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const where: any = {
        uplineId: { in: input.uplineIds },
      };
      const andConditions: any[] = [];

      if (input.search) {
        andConditions.push({
          OR: [
          { userId: { contains: input.search, mode: "insensitive" as const } },
          { uplineId: { contains: input.search, mode: "insensitive" as const } },
          { party: { partyName: { contains: input.search, mode: "insensitive" as const } } },
          { idCode: { contains: input.search, mode: "insensitive" as const } },
          ],
        });
      }

      if (input.active === "active") {
        where.active = true;
      } else if (input.active === "inactive") {
        where.active = false;
      }

      if (input.hasPartner === "yes") {
        where.partner = { not: null };
      } else if (input.hasPartner === "no") {
        andConditions.push({ OR: [{ partner: null }, { partner: "" }] });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const sortOrder = input.sortOrder;
      const orderBy =
        input.sortBy === "userId"
          ? { userId: sortOrder }
          : input.sortBy === "uplineId"
          ? { uplineId: sortOrder }
          : input.sortBy === "partyName"
          ? { party: { partyName: sortOrder } }
          : input.sortBy === "exchange"
          ? { exch: { idName: sortOrder } }
          : input.sortBy === "credit"
          ? { credit: sortOrder }
          : input.sortBy === "comm"
          ? { comm: sortOrder }
          : input.sortBy === "rate"
          ? { rate: sortOrder }
          : input.sortBy === "partner"
          ? { partnerParty: { partyName: sortOrder } }
          : { active: sortOrder };

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
          orderBy,
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
        sortBy: z
          .enum(["partyCode", "partyName", "ref", "idCount", "createdAt"])
          .default("partyName"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        hasRef: z.enum(["all", "yes", "no"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const where: any = {};
      const andConditions: any[] = [];

      if (input.search) {
        andConditions.push({
          OR: [
            { partyCode: { contains: input.search, mode: "insensitive" as const } },
            { partyName: { contains: input.search, mode: "insensitive" as const } },
            { ref: { contains: input.search, mode: "insensitive" as const } },
          ],
        });
      }

      if (input.hasRef === "yes") {
        andConditions.push({ ref: { not: null } });
        andConditions.push({ NOT: { ref: "" } });
      } else if (input.hasRef === "no") {
        andConditions.push({
          OR: [{ ref: null }, { ref: "" }],
        });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const sortOrder = input.sortOrder;
      const orderBy =
        input.sortBy === "partyCode"
          ? { partyCode: sortOrder }
          : input.sortBy === "partyName"
          ? { partyName: sortOrder }
          : input.sortBy === "ref"
          ? { ref: sortOrder }
          : input.sortBy === "createdAt"
          ? { createdAt: sortOrder }
          : { idMasters: { _count: sortOrder } };

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
          orderBy,
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
        sortBy: z
          .enum(["userId", "partyName", "exchange", "comm", "rate", "partner", "active", "isUpline", "uplineId"])
          .default("userId"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        active: z.enum(["all", "active", "inactive"]).default("all"),
        isUplineFilter: z.enum(["all", "upline", "downline"]).default("all"),
        hasPartner: z.enum(["all", "yes", "no"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const where: any = {
        partyCode: { in: input.partyCodes },
      };
      const andConditions: any[] = [];

      if (input.search) {
        andConditions.push({
          OR: [
          { userId: { contains: input.search, mode: "insensitive" as const } },
          { party: { partyName: { contains: input.search, mode: "insensitive" as const } } },
          { idCode: { contains: input.search, mode: "insensitive" as const } },
          { uplineId: { contains: input.search, mode: "insensitive" as const } },
          ],
        });
      }

      if (input.active === "active") {
        where.active = true;
      } else if (input.active === "inactive") {
        where.active = false;
      }

      if (input.isUplineFilter === "upline") {
        where.isUpline = true;
      } else if (input.isUplineFilter === "downline") {
        where.isUpline = false;
      }

      if (input.hasPartner === "yes") {
        where.partner = { not: null };
      } else if (input.hasPartner === "no") {
        andConditions.push({ OR: [{ partner: null }, { partner: "" }] });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const sortOrder = input.sortOrder;
      const orderBy =
        input.sortBy === "userId"
          ? { userId: sortOrder }
          : input.sortBy === "partyName"
          ? { party: { partyName: sortOrder } }
          : input.sortBy === "exchange"
          ? { exch: { idName: sortOrder } }
          : input.sortBy === "comm"
          ? { comm: sortOrder }
          : input.sortBy === "rate"
          ? { rate: sortOrder }
          : input.sortBy === "partner"
          ? { partnerParty: { partyName: sortOrder } }
          : input.sortBy === "active"
          ? { active: sortOrder }
          : input.sortBy === "isUpline"
          ? { isUpline: sortOrder }
          : { uplineId: sortOrder };

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
          orderBy,
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
