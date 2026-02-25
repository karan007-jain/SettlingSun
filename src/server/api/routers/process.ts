import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import {
  FORMATTER_REGISTRY,
  ALL_FORMATTER_NAMES,
  detectFormatter,
  type FormatterName,
} from "@/lib/formatters";
import { calculateUserRecord } from "@/lib/calculator";
import {
  parseFile,
  moveToProcessed,
} from "@/lib/file-parser";
import type { IdMaster, Exch, PartyMaster } from "@prisma/client";
import type { DbfRecord } from "@/lib/calculator";

interface IdMasterWithRelations extends IdMaster {
  exch: Exch;
  party: PartyMaster;
  partnerParty: PartyMaster | null;
}

type PreviewRowStatus = "ok" | "user_missing" | "skip";

export interface PreviewRow {
  rowIndex: number;
  status: PreviewRowStatus;
  userid: string;
  date: Date | null;
  point: number;
  upline: string;
  amtGross?: number;
  amtComm?: number;
  amtPati?: number;
  amount?: number;
  adrcr?: string;
  dbfRecord?: DbfRecord;
  missingInfo?: { userid: string; upline: string };
  foundInOtherUpline?: boolean;
}

export const processRouter = createTRPCRouter({
  // ── Step 4a: detect formatter from file headers ──────────────────────────
  detectFormatter: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const upload = await ctx.prisma.settlementUpload.findUnique({
        where: { id: input.uploadId },
      });
      if (!upload) throw new Error("Upload not found");

      // Check FormatConfig first
      const formatConfig = await ctx.prisma.formatConfig.findUnique({
        where: { filecode: upload.upline },
      });

      if (formatConfig) {
        return {
          formatter: formatConfig.formatter as FormatterName,
          score: 1.0,
          confidence: 100,
          fromConfig: true,
          allScores: [],
        };
      }

      // Parse file headers and detect
      const { headers, detection } = parseFile(upload.filepath, upload.filename);
      return { ...detection, fromConfig: false, headers };
    }),

  // ── Step 4b: parse file and return preview rows ──────────────────────────
  parseAndPreview: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        formatter: z.enum(ALL_FORMATTER_NAMES as [FormatterName, ...FormatterName[]]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.prisma.settlementUpload.findUnique({
        where: { id: input.uploadId },
      });
      if (!upload) throw new Error("Upload not found");

      await ctx.prisma.settlementUpload.update({
        where: { id: input.uploadId },
        data: { status: "processing" },
      });

      const { rows, headers } = parseFile(upload.filepath, upload.filename);
      const formatterFn = FORMATTER_REGISTRY[input.formatter];

      const previewRows: PreviewRow[] = [];
      const missingUsers: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const output = formatterFn(row, upload.upline);
          if (!output) continue; // null = skip this row

          // Look up user in IdMaster (try with upline first, fallback to any)
          const userEntry = await ctx.prisma.idMaster.findFirst({
            where: {
              userId: { contains: output.userid, mode: "insensitive" },
              uplineId: upload.upline,
            },
            include: { exch: true, party: true, partnerParty: true },
          })  as IdMasterWithRelations | null;

          if (!userEntry) {
            // Check if user exists in any other upline
            const otherUplineUser = await ctx.prisma.idMaster.findFirst({
              where: {
                userId: { startsWith: output.userid, mode: "insensitive" },
                NOT: { uplineId: upload.upline },
              },
            });

            missingUsers.push(output.userid);
            previewRows.push({
              rowIndex: i,
              status: "user_missing",
              userid: output.userid,
              date: output.date,
              point: output.point,
              upline: output.upline,
              missingInfo: { userid: output.userid, upline: upload.upline },
              foundInOtherUpline: !!otherUplineUser,
            });
            continue;
          }

          const dbfRecord = calculateUserRecord(output, userEntry);
          previewRows.push({
            rowIndex: i,
            status: "ok",
            userid: output.userid,
            date: output.date,
            point: output.point,
            upline: output.upline,
            amtGross: dbfRecord.AMT_GROSS,
            amtComm: dbfRecord.AMT_COMM,
            amtPati: dbfRecord.AMT_PATI,
            amount: dbfRecord.AMOUNT,
            adrcr: dbfRecord.ADRCR,
            dbfRecord,
          });
        } catch (err) {
          previewRows.push({
            rowIndex: i,
            status: "skip",
            userid: "",
            date: null,
            point: 0,
            upline: upload.upline,
          });
        }
      }

      // Check for existing upline records in DB
      const existingCount = await ctx.prisma.settlementRecord.count({
        where: { settleId: upload.settleId, upline: upload.upline },
      });

      // Collect ALL raw rows directly from the parsed file — independent of formatter
      const rawRows = rows.map((data, rowIndex) => ({ rowIndex, data }));

      return {
        previewRows,
        rawRows,
        headers,
        totalRows: rows.length,
        okRows: previewRows.filter((r) => r.status === "ok").length,
        missingUsers: [...new Set(missingUsers)],
        existingUplineCount: existingCount,
      };
    }),

  // ── Re-calculate a single row after user is added ────────────────────────
  recalculateRow: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        rowIndex: z.number(),
        formatter: z.enum(ALL_FORMATTER_NAMES as [FormatterName, ...FormatterName[]]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.prisma.settlementUpload.findUnique({
        where: { id: input.uploadId },
      });
      if (!upload) throw new Error("Upload not found");

      const { rows } = parseFile(upload.filepath, upload.filename);
      const row = rows[input.rowIndex];
      if (!row) throw new Error("Row not found");

      const formatterFn = FORMATTER_REGISTRY[input.formatter];
      const output = formatterFn(row, upload.upline);
      if (!output) return null;

      const userEntry = (await ctx.prisma.idMaster.findFirst({
        where: {
          userId: { startsWith: output.userid, mode: "insensitive" },
          uplineId: upload.upline,
        },
        include: { exch: true, party: true, partnerParty: true },
      }) ?? await ctx.prisma.idMaster.findFirst({
        where: { userId: { startsWith: output.userid, mode: "insensitive" } },
        include: { exch: true, party: true, partnerParty: true },
      })) as IdMasterWithRelations | null;

      if (!userEntry) return null;

      const dbfRecord = calculateUserRecord(output, userEntry);
      return {
        rowIndex: input.rowIndex,
        status: "ok" as PreviewRowStatus,
        userid: output.userid,
        date: output.date,
        point: output.point,
        upline: output.upline,
        amtGross: dbfRecord.AMT_GROSS,
        amtComm: dbfRecord.AMT_COMM,
        amtPati: dbfRecord.AMT_PATI,
        amount: dbfRecord.AMOUNT,
        adrcr: dbfRecord.ADRCR,
        dbfRecord,
      } as PreviewRow;
    }),

  // ── Add User (from AddUser modal) ─────────────────────────────────────────
  addUser: adminProcedure
    .input(
      z.object({
        userid: z.string().min(1),
        upline: z.string().min(1),
        partyCode: z.string().max(6),
        idCode: z.string().min(1), // Exch.idName
        rate: z.number().default(0),
        commission: z.number().default(0),
        partner: z.string().optional().nullable(),
        pati: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate partyCode exists
      const party = await ctx.prisma.partyMaster.findUnique({
        where: { partyCode: input.partyCode },
      });
      if (!party) throw new Error(`Party code ${input.partyCode} not found`);

      // Validate idCode exists in Exch
      const exch = await ctx.prisma.exch.findUnique({
        where: { idName: input.idCode },
      });
      if (!exch) throw new Error(`Item/Exchange ${input.idCode} not found`);

      // Find next available suffix for this userid + upline
      const baseUserId = input.userid.toUpperCase();
      const existingUsers = await ctx.prisma.idMaster.findMany({
        where: { userId: { startsWith: baseUserId  } },
      });
      let suffix = 0;
      while (existingUsers.some(u => u.userId === `${baseUserId}${'.'.repeat(suffix)}`)) {
        suffix++;
      }

      const newUserId = `${baseUserId}${'.'.repeat(suffix)}`;

      // Validate partner if provided
      if (input.partner && input.partner.trim() !== "") {
        const partnerParty = await ctx.prisma.partyMaster.findUnique({
          where: { partyCode: input.partner },
        });
        if (!partnerParty)
          throw new Error(`Partner party ${input.partner} not found`);
      }

      const newUser = await ctx.prisma.idMaster.create({
        data: {
          userId: newUserId,
          partyCode: input.partyCode,
          idCode: input.idCode,
          comm: input.commission,
          rate: input.rate,
          pati: input.pati,
          partner: input.partner?.trim() || null,
          active: true,
          isUpline: false,
          // Only set uplineId if the upline user exists in IdMaster (FK constraint)
          uplineId: await ctx.prisma.idMaster
            .findFirst({ where: { userId: input.upline } })
            .then((u) => u?.userId ?? null),
          credit: 0,
        },
        include: { exch: true, party: true, partnerParty: true },
      });

      return newUser;
    }),

  // ── Confirm & Write DBF ───────────────────────────────────────────────────
  confirm: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        formatter: z.enum(ALL_FORMATTER_NAMES as [FormatterName, ...FormatterName[]]),
        selectedRowIndexes: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.prisma.settlementUpload.findUnique({
        where: { id: input.uploadId },
      });
      if (!upload) throw new Error("Upload not found");

      const { rows } = parseFile(upload.filepath, upload.filename);
      const formatterFn = FORMATTER_REGISTRY[input.formatter];

      const selectedIndexes = new Set(input.selectedRowIndexes);
      const dbfRecords: DbfRecord[] = [];

      for (const idx of selectedIndexes) {
        const row = rows[idx];
        if (!row) continue;
        const output = formatterFn(row, upload.upline);
        if (!output) continue;

        const userEntry = (await ctx.prisma.idMaster.findFirst({
          where: {
            userId: { startsWith: output.userid, mode: "insensitive" },
            uplineId: upload.upline,
          },
          include: { exch: true, party: true, partnerParty: true },
        }) ?? await ctx.prisma.idMaster.findFirst({
          where: { userId: { startsWith: output.userid, mode: "insensitive" } },
          include: { exch: true, party: true, partnerParty: true },
        })) as IdMasterWithRelations | null;

        if (!userEntry) continue;

        const dbfRecord = calculateUserRecord(output, userEntry);
        dbfRecords.push(dbfRecord);
      }

      if (dbfRecords.length === 0) {
        throw new Error("No valid records to write");
      }

      // Write records to DB table
      await ctx.prisma.settlementRecord.createMany({
        data: dbfRecords.map((rec) => ({
          settlementId: upload.settlementId,
          uploadId: upload.id,
          settleId: upload.settleId,
          userId: rec.USERID,
          week: rec.WEEK,
          sodaType: rec.SODATYPE,
          pcode: rec.PCODE,
          date: rec.DATE,
          idName: rec.IDNAME,
          idShort: rec.IDSHORT,
          idPcode: rec.IDPCODE,
          idRate: rec.IDRATE,
          idComm: rec.IDCOMM,
          commission: rec.COMMISSION,
          rate: rec.RATE,
          pati: rec.PATI,
          partner: rec.PARTNER,
          point: rec.POINT,
          amtGross: rec.AMT_GROSS,
          amtComm: rec.AMT_COMM,
          amtPati: rec.AMT_PATI,
          amount: rec.AMOUNT,
          adrCr: rec.ADRCR,
          upline: rec.TIME,
          tally: rec.TALLY,
          diffAmt: rec.DIFFAMT,
        })),
      });
      const count = dbfRecords.length;

      // Move source file to processed
      const processedPath = moveToProcessed(
        upload.filepath,
        upload.upline,
        upload.filename
      );

      // Upsert FormatConfig for auto-learning
      await ctx.prisma.formatConfig.upsert({
        where: { filecode: upload.upline },
        create: { filecode: upload.upline, formatter: input.formatter },
        update: { formatter: input.formatter },
      });

      // Update upload status
      await ctx.prisma.settlementUpload.update({
        where: { id: input.uploadId },
        data: {
          status: "processed",
          recordCount: count,
          processedAt: new Date(),
          filepath: processedPath,
        },
      });

      return {
        count,
        settleId: upload.settleId,
      };
    }),

  // ── Read records from DB ──────────────────────────────────────────────────
  readRecords: protectedProcedure
    .input(z.object({ settleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.settlementRecord.findMany({
        where: { settleId: input.settleId },
        orderBy: { createdAt: "asc" },
      });
      // Map to uppercase DBF-style column names for the UI
      const records = rows.map((r) => ({
        WEEK:       r.week,
        SODATYPE:   r.sodaType,
        PCODE:      r.pcode,
        DATE:       r.date,
        USERID:     r.userId,
        IDNAME:     r.idName,
        IDSHORT:    r.idShort,
        IDPCODE:    r.idPcode,
        IDRATE:     Number(r.idRate),
        IDCOMM:     Number(r.idComm),
        COMMISSION: Number(r.commission),
        RATE:       Number(r.rate),
        PATI:       Number(r.pati),
        PARTNER:    r.partner,
        POINT:      Number(r.point),
        AMT_GROSS:  Number(r.amtGross),
        AMT_COMM:   Number(r.amtComm),
        AMT_PATI:   Number(r.amtPati),
        AMOUNT:     Number(r.amount),
        ADRCR:      r.adrCr,
        TIME:       r.upline,
        TALLY:      r.tally,
        DIFFAMT:    Number(r.diffAmt),
      }));
      return { records };
    }),

  // ── Check if upline already has records in DB ─────────────────────────────
  checkExistingUpline: protectedProcedure
    .input(z.object({ settleId: z.string(), upline: z.string() }))
    .query(async ({ ctx, input }) => {
      const count = await ctx.prisma.settlementRecord.count({
        where: { settleId: input.settleId, upline: input.upline },
      });
      return { count, exists: count > 0 };
    }),
});
