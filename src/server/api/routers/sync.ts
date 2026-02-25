import { z } from "zod";
import {
  createTRPCRouter,
  syncProcedure,
} from "@/server/api/trpc";

// Sync strategies
const SyncStrategy = z.enum(["UPSERT", "REPLACE", "INSERT_ONLY"]);

export const syncRouter = createTRPCRouter({
  // ========================================
  // PartyMaster Sync
  // ========================================
  syncPartyMaster: syncProcedure
    .input(
      z.object({
        strategy: SyncStrategy.default("UPSERT"),
        data: z.array(
          z.object({
            partyCode: z.string().max(6).toUpperCase(),
            partyName: z.string().max(15),
            ref: z.string().max(15).optional().nullable(),
          })
        ),
        deleteNotInSource: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = {
        inserted: 0,
        updated: 0,
        deleted: 0,
        errors: [] as string[],
      };

      try {
        if (input.strategy === "REPLACE") {
          // Delete all existing records first
          await ctx.prisma.partyMaster.deleteMany({});
          results.deleted = await ctx.prisma.partyMaster.count();
        }

        // Process each record
        for (const record of input.data) {
          try {
            if (input.strategy === "INSERT_ONLY") {
              // Only insert new records
              const existing = await ctx.prisma.partyMaster.findUnique({
                where: { partyCode: record.partyCode },
              });
              
              if (!existing) {
                await ctx.prisma.partyMaster.create({ data: record });
                results.inserted++;
              }
            } else {
              // Upsert (insert or update)
              const result = await ctx.prisma.partyMaster.upsert({
                where: { partyCode: record.partyCode },
                create: record,
                update: {
                  partyName: record.partyName,
                  ref: record.ref,
                },
              });
              
              // Check if it was an insert or update
              const existing = await ctx.prisma.partyMaster.findUnique({
                where: { partyCode: record.partyCode },
                select: { createdAt: true, updatedAt: true },
              });
              
              if (existing?.createdAt === existing?.updatedAt) {
                results.inserted++;
              } else {
                results.updated++;
              }
            }
          } catch (error: any) {
            results.errors.push(`PartyCode ${record.partyCode}: ${error.message}`);
          }
        }

        // Delete records not in source
        if (input.deleteNotInSource && input.strategy !== "REPLACE") {
          const sourceCodes = input.data.map((d) => d.partyCode);
          const deleteResult = await ctx.prisma.partyMaster.deleteMany({
            where: {
              partyCode: {
                notIn: sourceCodes,
              },
            },
          });
          results.deleted = deleteResult.count;
        }

        return results;
      } catch (error: any) {
        throw new Error(`Sync failed: ${error.message}`);
      }
    }),

  // ========================================
  // Exch Sync
  // ========================================
  syncExch: syncProcedure
    .input(
      z.object({
        strategy: SyncStrategy.default("UPSERT"),
        data: z.array(
          z.object({
            id: z.string().optional(),
            idName: z.string().max(15),
            partyCode: z.string().max(6),
            shortCode: z.string().max(8),
            rate: z.number(),
            idComm: z.number(),
            idAc: z.string().max(6),
          })
        ),
        deleteNotInSource: z.boolean().default(false),
        matchBy: z.enum(["ID", "SHORT_CODE"]).default("SHORT_CODE"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = {
        inserted: 0,
        updated: 0,
        deleted: 0,
        errors: [] as string[],
      };

      try {
        if (input.strategy === "REPLACE") {
          const count = await ctx.prisma.exch.count();
          await ctx.prisma.exch.deleteMany({});
          results.deleted = count;
        }

        // Process each record
        for (const record of input.data) {
          try {
            // Validate foreign keys
            const partyExists = await ctx.prisma.partyMaster.findUnique({
              where: { partyCode: record.partyCode },
            });
            const idAcExists = await ctx.prisma.partyMaster.findUnique({
              where: { partyCode: record.idAc },
            });

            if (!partyExists) {
              results.errors.push(`PartyCode ${record.partyCode} does not exist`);
              continue;
            }
            if (!idAcExists) {
              results.errors.push(`IdAc ${record.idAc} does not exist`);
              continue;
            }

            if (input.strategy === "INSERT_ONLY") {
              // Check by matchBy field
              let existing;
              if (input.matchBy === "SHORT_CODE") {
                existing = await ctx.prisma.exch.findFirst({
                  where: { shortCode: record.shortCode },
                });
              } else if (record.id) {
                existing = await ctx.prisma.exch.findUnique({
                  where: { id: record.id },
                });
              }

              if (!existing) {
                await ctx.prisma.exch.create({
                  data: {
                    idName: record.idName,
                    partyCode: record.partyCode,
                    shortCode: record.shortCode,
                    rate: record.rate,
                    idComm: record.idComm,
                    idAc: record.idAc,
                  },
                });
                results.inserted++;
              }
            } else {
              // Upsert
              if (input.matchBy === "SHORT_CODE") {
                const existing = await ctx.prisma.exch.findFirst({
                  where: { shortCode: record.shortCode },
                });

                if (existing) {
                  await ctx.prisma.exch.update({
                    where: { id: existing.id },
                    data: {
                      idName: record.idName,
                      partyCode: record.partyCode,
                      rate: record.rate,
                      idComm: record.idComm,
                      idAc: record.idAc,
                    },
                  });
                  results.updated++;
                } else {
                  await ctx.prisma.exch.create({
                    data: {
                      idName: record.idName,
                      partyCode: record.partyCode,
                      shortCode: record.shortCode,
                      rate: record.rate,
                      idComm: record.idComm,
                      idAc: record.idAc,
                    },
                  });
                  results.inserted++;
                }
              } else if (record.id) {
                await ctx.prisma.exch.upsert({
                  where: { id: record.id },
                  create: {
                    id: record.id,
                    idName: record.idName,
                    partyCode: record.partyCode,
                    shortCode: record.shortCode,
                    rate: record.rate,
                    idComm: record.idComm,
                    idAc: record.idAc,
                  },
                  update: {
                    idName: record.idName,
                    partyCode: record.partyCode,
                    shortCode: record.shortCode,
                    rate: record.rate,
                    idComm: record.idComm,
                    idAc: record.idAc,
                  },
                });
                results.updated++;
              }
            }
          } catch (error: any) {
            results.errors.push(`Exchange ${record.shortCode}: ${error.message}`);
          }
        }

        // Delete records not in source
        if (input.deleteNotInSource && input.strategy !== "REPLACE") {
          if (input.matchBy === "SHORT_CODE") {
            const sourceCodes = input.data.map((d) => d.shortCode);
            const deleteResult = await ctx.prisma.exch.deleteMany({
              where: {
                shortCode: {
                  notIn: sourceCodes,
                },
              },
            });
            results.deleted = deleteResult.count;
          }
        }

        return results;
      } catch (error: any) {
        throw new Error(`Sync failed: ${error.message}`);
      }
    }),

  // ========================================
  // IdMaster Sync
  // ========================================
  syncIdMaster: syncProcedure
    .input(
      z.object({
        strategy: SyncStrategy.default("UPSERT"),
        data: z.array(
          z.object({
            id: z.string().optional(),
            userId: z.string().max(15),
            partyCode: z.string().max(6),
            idCode: z.string(), // Exchange ID or shortCode
            credit: z.number().default(0),
            comm: z.number(),
            rate: z.number(),
            pati: z.number().optional().nullable(),
            partner: z.string().max(6).optional().nullable(),
            active: z.boolean().default(true),
            isUpline: z.boolean().default(false),
            uplineId: z.string().max(15).optional().nullable(),
          })
        ),
        deleteNotInSource: z.boolean().default(false),
        matchBy: z.enum(["ID", "USER_ID"]).default("USER_ID"),
        exchMatchBy: z.enum(["ID", "SHORT_CODE"]).default("SHORT_CODE"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = {
        inserted: 0,
        updated: 0,
        deleted: 0,
        errors: [] as string[],
      };

      try {
        if (input.strategy === "REPLACE") {
          const count = await ctx.prisma.idMaster.count();
          await ctx.prisma.idMaster.deleteMany({});
          results.deleted = count;
        }

        // Process each record
        for (const record of input.data) {
          try {
            // Validate foreign keys
            const partyExists = await ctx.prisma.partyMaster.findUnique({
              where: { partyCode: record.partyCode },
            });

            if (!partyExists) {
              results.errors.push(`PartyCode ${record.partyCode} does not exist for userId ${record.userId}`);
              continue;
            }

            // Validate partner if provided
            if (record.partner) {
              const partnerExists = await ctx.prisma.partyMaster.findUnique({
                where: { partyCode: record.partner },
              });
              if (!partnerExists) {
                results.errors.push(`Partner ${record.partner} does not exist for userId ${record.userId}`);
                continue;
              }
            }

            // Find exchange by shortCode or ID
            let exch;
            if (input.exchMatchBy === "SHORT_CODE") {
              exch = await ctx.prisma.exch.findFirst({
                where: { shortCode: record.idCode },
              });
            } else {
              exch = await ctx.prisma.exch.findUnique({
                where: { id: record.idCode },
              });
            }

            if (!exch) {
              results.errors.push(`Exchange ${record.idCode} does not exist for userId ${record.userId}`);
              continue;
            }

            // Validate upline if provided
            if (record.uplineId && !record.isUpline) {
              const uplineExists = await ctx.prisma.idMaster.findUnique({
                where: { userId: record.uplineId, isUpline: true },
              });
              if (!uplineExists) {
                results.errors.push(`Upline ${record.uplineId} does not exist for userId ${record.userId}`);
                continue;
              }
            }

            const dataToSync = {
              userId: record.userId,
              partyCode: record.partyCode,
              idCode: exch.id,
              credit: record.credit || 0,
              comm: record.comm,
              rate: record.rate,
              pati: record.pati,
              partner: record.partner || null,
              active: record.active,
              isUpline: record.isUpline,
              uplineId: record.isUpline ? null : record.uplineId,
            };

            if (input.strategy === "INSERT_ONLY") {
              let existing;
              if (input.matchBy === "USER_ID") {
                existing = await ctx.prisma.idMaster.findUnique({
                  where: { userId: record.userId },
                });
              } else if (record.id) {
                existing = await ctx.prisma.idMaster.findUnique({
                  where: { id: record.id },
                });
              }

              if (!existing) {
                await ctx.prisma.idMaster.create({ data: dataToSync });
                results.inserted++;
              }
            } else {
              // Upsert
              if (input.matchBy === "USER_ID") {
                const existing = await ctx.prisma.idMaster.findUnique({
                  where: { userId: record.userId },
                });

                if (existing) {
                  await ctx.prisma.idMaster.update({
                    where: { userId: record.userId },
                    data: {
                      partyCode: dataToSync.partyCode,
                      idCode: dataToSync.idCode,
                      credit: dataToSync.credit,
                      comm: dataToSync.comm,
                      rate: dataToSync.rate,
                      pati: dataToSync.pati,
                      partner: dataToSync.partner,
                      active: dataToSync.active,
                      isUpline: dataToSync.isUpline,
                      uplineId: dataToSync.uplineId,
                    },
                  });
                  results.updated++;
                } else {
                  await ctx.prisma.idMaster.create({ data: dataToSync });
                  results.inserted++;
                }
              } else if (record.id) {
                await ctx.prisma.idMaster.upsert({
                  where: { id: record.id },
                  create: { ...dataToSync, id: record.id },
                  update: {
                    partyCode: dataToSync.partyCode,
                    idCode: dataToSync.idCode,
                    credit: dataToSync.credit,
                    comm: dataToSync.comm,
                    rate: dataToSync.rate,
                    pati: dataToSync.pati,
                    partner: dataToSync.partner,
                    active: dataToSync.active,
                    isUpline: dataToSync.isUpline,
                    uplineId: dataToSync.uplineId,
                  },
                });
                results.updated++;
              }
            }
          } catch (error: any) {
            results.errors.push(`UserId ${record.userId}: ${error.message}`);
          }
        }

        // Delete records not in source
        if (input.deleteNotInSource && input.strategy !== "REPLACE") {
          if (input.matchBy === "USER_ID") {
            const sourceUserIds = input.data.map((d) => d.userId);
            const deleteResult = await ctx.prisma.idMaster.deleteMany({
              where: {
                userId: {
                  notIn: sourceUserIds,
                },
              },
            });
            results.deleted = deleteResult.count;
          }
        }

        return results;
      } catch (error: any) {
        throw new Error(`Sync failed: ${error.message}`);
      }
    }),

  // ========================================
  // Validation Endpoints
  // ========================================
  validatePartyMaster: syncProcedure
    .input(
      z.array(
        z.object({
          partyCode: z.string(),
          partyName: z.string(),
          ref: z.string().optional().nullable(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const errors: string[] = [];
      const duplicates: string[] = [];
      const partyCodes = new Set<string>();

      for (const record of input) {
        // Check length constraints
        if (record.partyCode.length !== 6) {
          errors.push(`PartyCode ${record.partyCode} must be exactly 6 characters`);
        }
        if (record.partyName.length > 15) {
          errors.push(`PartyName for ${record.partyCode} exceeds 15 characters`);
        }
        if (record.ref && record.ref.length > 15) {
          errors.push(`Ref for ${record.partyCode} exceeds 15 characters`);
        }

        // Check for duplicates in input
        if (partyCodes.has(record.partyCode)) {
          duplicates.push(record.partyCode);
        }
        partyCodes.add(record.partyCode);
      }

      return {
        valid: errors.length === 0 && duplicates.length === 0,
        errors,
        duplicates,
        totalRecords: input.length,
      };
    }),

  validateExch: syncProcedure
    .input(
      z.array(
        z.object({
          idName: z.string(),
          partyCode: z.string(),
          shortCode: z.string(),
          rate: z.number(),
          idComm: z.number(),
          idAc: z.string(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const errors: string[] = [];
      const duplicates: string[] = [];
      const missingParties: string[] = [];
      const shortCodes = new Set<string>();

      // Get all party codes
      const parties = await ctx.prisma.partyMaster.findMany({
        select: { partyCode: true },
      });
      const validPartyCodes = new Set(parties.map((p) => p.partyCode));

      for (const record of input) {
        // Check length constraints
        if (record.idName.length > 15) {
          errors.push(`IdName ${record.idName} exceeds 15 characters`);
        }
        if (record.shortCode.length > 8) {
          errors.push(`ShortCode ${record.shortCode} exceeds 8 characters`);
        }

        // Check foreign keys
        if (!validPartyCodes.has(record.partyCode)) {
          missingParties.push(record.partyCode);
        }
        if (!validPartyCodes.has(record.idAc)) {
          missingParties.push(record.idAc);
        }

        // Check for duplicates
        if (shortCodes.has(record.shortCode)) {
          duplicates.push(record.shortCode);
        }
        shortCodes.add(record.shortCode);
      }

      return {
        valid: errors.length === 0 && duplicates.length === 0 && missingParties.length === 0,
        errors,
        duplicates,
        missingParties: [...new Set(missingParties)],
        totalRecords: input.length,
      };
    }),

  // ========================================
  // Sync Status
  // ========================================
  getSyncStatus: syncProcedure.query(async ({ ctx }) => {
    const [partyCount, exchCount, idMasterCount] = await Promise.all([
      ctx.prisma.partyMaster.count(),
      ctx.prisma.exch.count(),
      ctx.prisma.idMaster.count(),
    ]);

    return {
      partyMaster: partyCount,
      exch: exchCount,
      idMaster: idMasterCount,
      lastSync: new Date(), // You can add a SyncLog table to track this
    };
  }),

  // ========================================
  // Export Endpoints (PostgreSQL to DBF)
  // ========================================
  exportPartyMaster: syncProcedure
    .input(
      z.object({
        modifiedSince: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where = input?.modifiedSince
        ? {
            updatedAt: {
              gte: input.modifiedSince,
            },
          }
        : {};

      const parties = await ctx.prisma.partyMaster.findMany({
        where,
        orderBy: { partyCode: "asc" },
      });

      return parties.map((p) => ({
        PARTY_CODE: p.partyCode,
        PARTY_NAME: p.partyName,
        REF: p.ref || "",
      }));
    }),

  exportExch: syncProcedure
    .input(
      z.object({
        modifiedSince: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where = input?.modifiedSince
        ? {
            updatedAt: {
              gte: input.modifiedSince,
            },
          }
        : {};

      const exchanges = await ctx.prisma.exch.findMany({
        where,
        orderBy: { shortCode: "asc" },
      });

      return exchanges.map((e) => ({
        ID_NAME: e.idName,
        PARTY_CODE: e.partyCode,
        SHORT_CODE: e.shortCode,
        RATE: Number(e.rate),
        ID_COMM: Number(e.idComm),
        ID_AC: e.idAc,
      }));
    }),

  exportIdMaster: syncProcedure
    .input(
      z.object({
        modifiedSince: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where = input?.modifiedSince
        ? {
            updatedAt: {
              gte: input.modifiedSince,
            },
          }
        : {};

      const idMasters = await ctx.prisma.idMaster.findMany({
        where,
        include: {
          exch: true,
        },
        orderBy: { userId: "asc" },
      });

      return idMasters.map((id) => ({
        USER_ID: id.userId,
        PARTY_CODE: id.partyCode,
        ID_CODE: id.exch.shortCode,
        CREDIT: Number(id.credit),
        COMM: Number(id.comm),
        RATE: Number(id.rate),
        PATI: id.pati ? Number(id.pati) : 0,
        PARTNER: id.partner || "",
        ACTIVE: id.active ? 1 : 0,
        IS_UPLINE: id.isUpline ? 1 : 0,
        UPLINE_ID: id.uplineId || "",
      }));
    }),

  // Export changes since last sync
  exportChanges: syncProcedure
    .input(
      z.object({
        since: z.date(),
        entities: z.array(z.enum(["party", "exch", "idmaster"])).default(["party", "exch", "idmaster"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const result: any = {};

      if (input.entities.includes("party")) {
        const parties = await ctx.prisma.partyMaster.findMany({
          where: {
            updatedAt: { gte: input.since },
          },
          orderBy: { partyCode: "asc" },
        });

        result.partyMaster = parties.map((p) => ({
          PARTY_CODE: p.partyCode,
          PARTY_NAME: p.partyName,
          REF: p.ref || "",
        }));
      }

      if (input.entities.includes("exch")) {
        const exchanges = await ctx.prisma.exch.findMany({
          where: {
            updatedAt: { gte: input.since },
          },
          orderBy: { shortCode: "asc" },
        });

        result.exch = exchanges.map((e) => ({
          ID_NAME: e.idName,
          PARTY_CODE: e.partyCode,
          SHORT_CODE: e.shortCode,
          RATE: Number(e.rate),
          ID_COMM: Number(e.idComm),
          ID_AC: e.idAc,
        }));
      }

      if (input.entities.includes("idmaster")) {
        const idMasters = await ctx.prisma.idMaster.findMany({
          where: {
            updatedAt: { gte: input.since },
          },
          include: {
            exch: true,
          },
          orderBy: { userId: "asc" },
        });

        result.idMaster = idMasters.map((id) => ({
          USER_ID: id.userId,
          PARTY_CODE: id.partyCode,
          ID_CODE: id.exch.shortCode,
          CREDIT: Number(id.credit),
          COMM: Number(id.comm),
          RATE: Number(id.rate),
          PATI: id.pati ? Number(id.pati) : 0,
          PARTNER: id.partner || "",
          ACTIVE: id.active ? 1 : 0,
          IS_UPLINE: id.isUpline ? 1 : 0,
          UPLINE_ID: id.uplineId || "",
        }));
      }

      return result;
    }),
});
