import { BaseRepository } from './BaseRepository'

export interface AccountRow {
  id: string
  account_name: string
  other_name: string | null
  account_type: string | null
  account_group_id: string
  group_name: string
  group_type: string
  mobile_number: string | null
  whatsapp_number: string | null
  phone2: string | null
  address: string | null
  city: string | null
  state: string | null
  gst_no: string | null
  pan_no: string | null
  last_date: string | null
  opening_gold_fine: number
  opening_silver_fine: number
  opening_cash: number
  opening_anamat: number
  opening_bank: number
  gold_fine_limit: number
  silver_fine_limit: number
  notification: string | null
  active: number
  created_at: string
  updated_at: string
}

const accountSelectSql = `
  SELECT
    a.id,
    a.account_name,
    a.other_name,
    a.account_type,
    a.account_group_id,
    ag.group_name,
    ag.group_type,
    a.mobile_number,
    a.whatsapp_number,
    a.phone2,
    a.address,
    a.city,
    a.state,
    a.gst_no,
    a.pan_no,
    a.last_date,
    a.opening_gold_fine,
    a.opening_silver_fine,
    a.opening_cash,
    a.opening_anamat,
    a.opening_bank,
    a.gold_fine_limit,
    a.silver_fine_limit,
    a.notification,
    a.active,
    a.created_at,
    a.updated_at
  FROM accounts a
  INNER JOIN account_groups ag ON ag.id = a.account_group_id
`

export class AccountRepository extends BaseRepository {
  findAll(): AccountRow[] {
    return this.db
      .prepare(
        `
        ${accountSelectSql}
        WHERE a.deleted_at IS NULL
        ORDER BY a.account_name ASC
      `
      )
      .all() as AccountRow[]
  }

  findById(id: string): AccountRow | undefined {
    return this.db
      .prepare(
        `
        ${accountSelectSql}
        WHERE a.id = ?
        AND a.deleted_at IS NULL
      `
      )
      .get(id) as AccountRow | undefined
  }

  findDuplicate(name: string, excludeId?: string): { id: string } | undefined {
    if (excludeId) {
      return this.db
        .prepare(
          `
          SELECT id FROM accounts
          WHERE LOWER(account_name) = LOWER(?)
          AND id != ?
          AND deleted_at IS NULL
        `
        )
        .get(name, excludeId) as { id: string } | undefined
    }

    return this.db
      .prepare(
        `
        SELECT id FROM accounts
        WHERE LOWER(account_name) = LOWER(?)
        AND deleted_at IS NULL
      `
      )
      .get(name) as { id: string } | undefined
  }

  groupExists(groupId: string): boolean {
    const row = this.db
      .prepare(
        `
        SELECT id FROM account_groups
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .get(groupId)
    return Boolean(row)
  }

  insert(data: {
    id: string
    accountName: string
    otherName: string
    accountType: string
    accountGroupId: string
    mobileNumber: string
    whatsappNumber: string
    phone2: string
    address: string
    city: string
    state: string
    gstNo: string
    panNo: string
    lastDate: string
    openingGoldFine: number
    openingSilverFine: number
    openingCash: number
    openingAnamat: number
    openingBank: number
    goldFineLimit: number
    silverFineLimit: number
    notification: string
    active: boolean
    createdAt: string
    updatedAt: string
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO accounts (
          id, account_name, other_name, account_type, account_group_id,
          mobile_number, whatsapp_number, phone2, address, city, state,
          gst_no, pan_no, last_date, opening_gold_fine, opening_silver_fine,
          opening_cash, opening_anamat, opening_bank, gold_fine_limit,
          silver_fine_limit, notification, active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.id,
        data.accountName,
        data.otherName,
        data.accountType,
        data.accountGroupId,
        data.mobileNumber,
        data.whatsappNumber,
        data.phone2,
        data.address,
        data.city,
        data.state,
        data.gstNo,
        data.panNo,
        data.lastDate,
        data.openingGoldFine,
        data.openingSilverFine,
        data.openingCash,
        data.openingAnamat,
        data.openingBank,
        data.goldFineLimit,
        data.silverFineLimit,
        data.notification,
        data.active ? 1 : 0,
        data.createdAt,
        data.updatedAt
      )
  }

  update(
    id: string,
    data: {
      accountName: string
      otherName: string
      accountType: string
      accountGroupId: string
      mobileNumber: string
      whatsappNumber: string
      phone2: string
      address: string
      city: string
      state: string
      gstNo: string
      panNo: string
      lastDate: string
      openingGoldFine: number
      openingSilverFine: number
      openingCash: number
      openingAnamat: number
      openingBank: number
      goldFineLimit: number
      silverFineLimit: number
      notification: string
      active: boolean
      updatedAt: string
    }
  ): void {
    this.db
      .prepare(
        `
        UPDATE accounts
        SET
          account_name = ?, other_name = ?, account_type = ?, account_group_id = ?,
          mobile_number = ?, whatsapp_number = ?, phone2 = ?, address = ?, city = ?,
          state = ?, gst_no = ?, pan_no = ?, last_date = ?, opening_gold_fine = ?,
          opening_silver_fine = ?, opening_cash = ?, opening_anamat = ?, opening_bank = ?,
          gold_fine_limit = ?, silver_fine_limit = ?, notification = ?, active = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        data.accountName,
        data.otherName,
        data.accountType,
        data.accountGroupId,
        data.mobileNumber,
        data.whatsappNumber,
        data.phone2,
        data.address,
        data.city,
        data.state,
        data.gstNo,
        data.panNo,
        data.lastDate,
        data.openingGoldFine,
        data.openingSilverFine,
        data.openingCash,
        data.openingAnamat,
        data.openingBank,
        data.goldFineLimit,
        data.silverFineLimit,
        data.notification,
        data.active ? 1 : 0,
        data.updatedAt,
        id
      )
  }

  delete(id: string, now: string): void {
    this.db
      .prepare(
        `
        UPDATE accounts
        SET deleted_at = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `
      )
      .run(now, now, id)
  }
}
