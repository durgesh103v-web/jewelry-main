import dayjs from 'dayjs'
import { z } from 'zod'
import { getDatabase } from '../database/connection'

const DEFAULT_FIRM_ID = 'default-firm'

const firmSchema = z.object({
  firmName: z.string().trim().optional().default(''),
  tagline: z.string().trim().optional().default(''),
  ownerName: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  state: z.string().trim().optional().default(''),
  stateCode: z.string().trim().optional().default(''),
  pincode: z.string().trim().optional().default(''),
  mobileNumber: z.string().trim().optional().default(''),
  whatsappNumber: z.string().trim().optional().default(''),
  email: z.string().trim().optional().default(''),
  gstNo: z.string().trim().optional().default(''),
  panNo: z.string().trim().optional().default(''),
  bisLicenseNo: z.string().trim().optional().default(''),
  hallmarkCenter: z.string().trim().optional().default(''),
  legalMetrologyNo: z.string().trim().optional().default(''),
  bankName: z.string().trim().optional().default(''),
  bankBranch: z.string().trim().optional().default(''),
  bankAccountNo: z.string().trim().optional().default(''),
  bankIfsc: z.string().trim().optional().default(''),
  bankAccountName: z.string().trim().optional().default(''),
  upiId: z.string().trim().optional().default(''),
  billTitle: z.string().trim().optional().default('SALE BILL'),
  billPrefix: z.string().trim().optional().default('SL'),
  terms: z.string().trim().optional().default(''),
  invoiceFooterNote: z.string().trim().optional().default(''),
  buybackPolicy: z.string().trim().optional().default(''),
  authorisedSignatory: z.string().trim().optional().default(''),
  logoUrl: z.string().trim().optional().default(''),
  active: z.boolean().default(true)
})

export type FirmPayload = z.infer<typeof firmSchema>

type FirmRow = {
  id: string
  firm_name: string
  tagline?: string
  owner_name: string
  address: string
  city: string
  state: string
  state_code?: string
  pincode: string
  mobile_number: string
  whatsapp_number: string
  email: string
  gst_no: string
  pan_no: string
  bis_license_no?: string
  hallmark_center?: string
  legal_metrology_no?: string
  bank_name?: string
  bank_branch?: string
  bank_account_no?: string
  bank_ifsc?: string
  bank_account_name?: string
  upi_id?: string
  bill_title: string
  bill_prefix: string
  terms: string
  invoice_footer_note?: string
  buyback_policy?: string
  authorised_signatory?: string
  logo_url?: string
  active: number
  created_at: string
  updated_at: string
}

export type FirmRecord = {
  id: string
  firmName: string
  tagline: string
  ownerName: string
  address: string
  city: string
  state: string
  stateCode: string
  pincode: string
  mobileNumber: string
  whatsappNumber: string
  email: string
  gstNo: string
  panNo: string
  bisLicenseNo: string
  hallmarkCenter: string
  legalMetrologyNo: string
  bankName: string
  bankBranch: string
  bankAccountNo: string
  bankIfsc: string
  bankAccountName: string
  upiId: string
  billTitle: string
  billPrefix: string
  terms: string
  invoiceFooterNote: string
  buybackPolicy: string
  authorisedSignatory: string
  logoUrl: string
  active: boolean
  createdAt: string
  updatedAt: string
}

function mapRow(row: FirmRow): FirmRecord {
  return {
    id: row.id,
    firmName: row.firm_name || '',
    tagline: row.tagline || '',
    ownerName: row.owner_name || '',
    address: row.address || '',
    city: row.city || '',
    state: row.state || '',
    stateCode: row.state_code || '',
    pincode: row.pincode || '',
    mobileNumber: row.mobile_number || '',
    whatsappNumber: row.whatsapp_number || '',
    email: row.email || '',
    gstNo: row.gst_no || '',
    panNo: row.pan_no || '',
    bisLicenseNo: row.bis_license_no || '',
    hallmarkCenter: row.hallmark_center || '',
    legalMetrologyNo: row.legal_metrology_no || '',
    bankName: row.bank_name || '',
    bankBranch: row.bank_branch || '',
    bankAccountNo: row.bank_account_no || '',
    bankIfsc: row.bank_ifsc || '',
    bankAccountName: row.bank_account_name || '',
    upiId: row.upi_id || '',
    billTitle: row.bill_title || 'SALE BILL',
    billPrefix: row.bill_prefix || 'SL',
    terms: row.terms || '',
    invoiceFooterNote: row.invoice_footer_note || '',
    buybackPolicy: row.buyback_policy || '',
    authorisedSignatory: row.authorised_signatory || '',
    logoUrl: row.logo_url || '',
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const firmService = {
  get(): FirmRecord {
    const db = getDatabase()

    const row = db
      .prepare(
        `
        SELECT *
        FROM firm_settings
        WHERE id = ?
      `
      )
      .get(DEFAULT_FIRM_ID) as FirmRow | undefined

    if (!row) {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

      db.prepare(
        `
        INSERT INTO firm_settings (
          id,
          firm_name,
          bill_title,
          bill_prefix,
          active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run(DEFAULT_FIRM_ID, '', 'SALE BILL', 'SL', 1, now, now)

      const created = db
        .prepare(
          `
          SELECT *
          FROM firm_settings
          WHERE id = ?
        `
        )
        .get(DEFAULT_FIRM_ID) as FirmRow

      return mapRow(created)
    }

    return mapRow(row)
  },

  save(payload: unknown): FirmRecord {
    const data = firmSchema.parse(payload)
    const db = getDatabase()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = db
      .prepare(
        `
        SELECT id
        FROM firm_settings
        WHERE id = ?
      `
      )
      .get(DEFAULT_FIRM_ID)

    if (existing) {
      db.prepare(
        `
        UPDATE firm_settings
        SET
          firm_name = ?,
          tagline = ?,
          owner_name = ?,
          address = ?,
          city = ?,
          state = ?,
          state_code = ?,
          pincode = ?,
          mobile_number = ?,
          whatsapp_number = ?,
          email = ?,
          gst_no = ?,
          pan_no = ?,
          bis_license_no = ?,
          hallmark_center = ?,
          legal_metrology_no = ?,
          bank_name = ?,
          bank_branch = ?,
          bank_account_no = ?,
          bank_ifsc = ?,
          bank_account_name = ?,
          upi_id = ?,
          bill_title = ?,
          bill_prefix = ?,
          terms = ?,
          invoice_footer_note = ?,
          buyback_policy = ?,
          authorised_signatory = ?,
          logo_url = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        data.firmName,
        data.tagline,
        data.ownerName,
        data.address,
        data.city,
        data.state,
        data.stateCode,
        data.pincode,
        data.mobileNumber,
        data.whatsappNumber,
        data.email,
        data.gstNo,
        data.panNo,
        data.bisLicenseNo,
        data.hallmarkCenter,
        data.legalMetrologyNo,
        data.bankName,
        data.bankBranch,
        data.bankAccountNo,
        data.bankIfsc,
        data.bankAccountName,
        data.upiId,
        data.billTitle || 'SALE BILL',
        data.billPrefix || 'SL',
        data.terms,
        data.invoiceFooterNote,
        data.buybackPolicy,
        data.authorisedSignatory,
        data.logoUrl,
        data.active ? 1 : 0,
        now,
        DEFAULT_FIRM_ID
      )
    } else {
      db.prepare(
        `
        INSERT INTO firm_settings (
          id,
          firm_name,
          tagline,
          owner_name,
          address,
          city,
          state,
          state_code,
          pincode,
          mobile_number,
          whatsapp_number,
          email,
          gst_no,
          pan_no,
          bis_license_no,
          hallmark_center,
          legal_metrology_no,
          bank_name,
          bank_branch,
          bank_account_no,
          bank_ifsc,
          bank_account_name,
          upi_id,
          bill_title,
          bill_prefix,
          terms,
          invoice_footer_note,
          buyback_policy,
          authorised_signatory,
          logo_url,
          active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        DEFAULT_FIRM_ID,
        data.firmName,
        data.tagline,
        data.ownerName,
        data.address,
        data.city,
        data.state,
        data.stateCode,
        data.pincode,
        data.mobileNumber,
        data.whatsappNumber,
        data.email,
        data.gstNo,
        data.panNo,
        data.bisLicenseNo,
        data.hallmarkCenter,
        data.legalMetrologyNo,
        data.bankName,
        data.bankBranch,
        data.bankAccountNo,
        data.bankIfsc,
        data.bankAccountName,
        data.upiId,
        data.billTitle || 'SALE BILL',
        data.billPrefix || 'SL',
        data.terms,
        data.invoiceFooterNote,
        data.buybackPolicy,
        data.authorisedSignatory,
        data.logoUrl,
        data.active ? 1 : 0,
        now,
        now
      )
    }

    return this.get()
  }
}
