import type { IdMaster, Exch, PartyMaster } from "@prisma/client";
import type { FormatterOutput } from "./formatters";

export interface IdMasterWithRelations extends IdMaster {
  exch: Exch;
  party: PartyMaster;
  partnerParty: PartyMaster | null;
}

export interface DbfRecord {
  WEEK: number;
  SODATYPE: string;
  PCODE: string;
  DATE: Date;
  USERID: string;
  IDNAME: string;
  IDSHORT: string;
  IDPCODE: string;
  IDRATE: number;
  IDCOMM: number;
  COMMISSION: number;
  RATE: number;
  PATI: number;
  PARTNER: string;
  POINT: number;
  AMT_GROSS: number;
  AMT_COMM: number;
  AMT_PATI: number;
  AMOUNT: number;
  ADRCR: string;
  TIME: string;
  TALLY: boolean;
  DIFFAMT: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateUserRecord(
  output: FormatterOutput,
  userEntry: IdMasterWithRelations
): DbfRecord {
  const gross = output.point;

  const RATE = Number(userEntry.rate);
  const COMMISSION = Number(userEntry.comm);
  const PATI = Number(userEntry.pati ?? 0);
  const PARTNER = userEntry.partner ?? "";
  const PCODE = userEntry.partyCode;
  const IDRATE = Number(userEntry.exch.rate);
  const IDCOMM = Number(userEntry.exch.idComm);

  // A "dot" in USERID means rate-based user (e.g. "JAMES.0")
  const hasStar = userEntry.userId.includes("*");

  let point: number;
  let amtGross: number;
  let effectiveRate = RATE;

  if (!hasStar) {
    point = round2(gross);
    amtGross = round2((gross * RATE) / 10000);
  } else {
    amtGross = round2(gross / 100);
    point = round2(gross / 100) / RATE * 10000;
  }

  let amtComm = 0;
  let amtPati = 0;
  let amount = 0;

  if (PARTNER.trim() !== "") {
    if (PARTNER.toLowerCase() === PCODE.toLowerCase()) {
      // self-partner
      if (amtGross !== 0 && COMMISSION !== 0) {
        amtComm = round2((amtGross * COMMISSION) / 100);
      }
      amount = round2(amtGross - amtComm);
      amtPati = !hasStar
        ? round2((PATI * effectiveRate) / 10000)
        : round2(PATI / 100);
      amount = round2(amount - amtPati);
    } else {
      amtPati = !hasStar
        ? round2((PATI * effectiveRate) / 10000)
        : round2(PATI / 100);
      amount = round2(amtGross - amtPati);
      if (amount !== 0 && COMMISSION !== 0) {
        amtComm = round2((amtGross * COMMISSION) / 100);
        amount = round2(amtGross - amtComm);
      }
    }
  } else {
    if (amtGross !== 0 && COMMISSION !== 0) {
      amtComm = round2((amtGross * COMMISSION) / 100);
    }
    amount = round2(amtGross - amtComm);
  }

  const adrcr = gross < 0 ? "D" : "C";

  return {
    WEEK: 0,
    SODATYPE: "2",
    PCODE: userEntry.partyCode,
    DATE: output.date,
    USERID: userEntry.userId,
    IDNAME: userEntry.exch.idName,
    IDSHORT: userEntry.exch.shortCode,
    IDPCODE: userEntry.exch.partyCode,
    IDRATE,
    IDCOMM,
    COMMISSION,
    RATE: hasStar ? RATE : effectiveRate,
    PATI,
    PARTNER,
    POINT: point,
    AMT_GROSS: amtGross,
    AMT_COMM: amtComm,
    AMT_PATI: amtPati,
    AMOUNT: amount,
    ADRCR: adrcr,
    TIME: output.upline,
    TALLY: false,
    DIFFAMT: 0,
  };
}
