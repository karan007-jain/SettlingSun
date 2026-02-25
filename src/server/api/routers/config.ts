import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { ALL_FORMATTER_NAMES, type FormatterName } from "@/lib/formatters";

export const configRouter = createTRPCRouter({
  saveMapping: adminProcedure
    .input(
      z.object({
        filecode: z.string().min(1),
        formatter: z.enum(ALL_FORMATTER_NAMES as [FormatterName, ...FormatterName[]]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.formatConfig.upsert({
        where: { filecode: input.filecode },
        create: { filecode: input.filecode, formatter: input.formatter },
        update: { formatter: input.formatter },
      });
    }),

  getMappings: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.formatConfig.findMany({
      orderBy: { filecode: "asc" },
    });
  }),

  deleteMapping: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.formatConfig.delete({
        where: { id: input.id },
      });
    }),

  // Party Master (re-export for settlement use with optional search)
  getPartyMaster: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.partyMaster.findMany({
        where: input.search
          ? {
              partyCode: {
                contains: input.search.toUpperCase(),
                mode: "insensitive",
              },
            }
          : undefined,
        orderBy: { partyCode: "asc" },
        take: 50,
      });
    }),

  // Item Master = Exch table (with optional search)
  getItemMaster: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.exch.findMany({
        where: input.search
          ? {
              idName: {
                contains: input.search,
                mode: "insensitive",
              },
            }
          : undefined,
        orderBy: { idName: "asc" },
        take: 50,
      });
    }),

  getItemByIdName: protectedProcedure
    .input(z.object({ idName: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.exch.findUnique({
        where: { idName: input.idName },
      });
    }),

  // Upline codes from IdMaster (isUpline = true)
  getUplines: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.idMaster.findMany({
      where: { isUpline: true },
      select: { userId: true, idCode: true },
      orderBy: { userId: "asc" },
    });
  }),

  // FormatConfig filecodes as autocomplete for upline input
  getFormatFilecodes: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.formatConfig.findMany({
      select: { filecode: true, formatter: true },
      orderBy: { filecode: "asc" },
    });
  }),
});
