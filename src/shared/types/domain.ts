import type { BusinessTypeConstant } from '../constants/business'
import type { UserRole } from '../constants/roles'
import type { LabourRateType } from '../jewelleryFormula'

export type AccountGroupRecord = {
  id: string
  groupName: string
  groupType: string
  description: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type AccountRecord = {
  id: string
  accountName: string
  otherName: string
  accountType: string
  accountGroupId: string
  groupName?: string
  groupType?: string
  openingGoldFine: number
  openingSilverFine: number
  openingCash: number
  openingAnamat: number
  openingBank: number
  lastDate?: string
  goldFineLimit?: number
  silverFineLimit?: number
  mobileNumber: string
  whatsappNumber: string
  phone2?: string
  address: string
  city: string
  state: string
  gstNo: string
  panNo: string
  notification?: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type ItemGroupRecord = {
  id: string
  groupName: string
  metalType: string
  description: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type ItemStampRecord = {
  id: string
  stampName: string
  metalType: string
  description: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type ItemDesignRecord = {
  id: string
  designName: string
  metalType: string
  description: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type ItemRecord = {
  id: string
  itemName: string
  metalType: string
  itemGroupId: string
  itemGroupName?: string
  defaultStampId: string
  defaultStampName?: string
  defaultDesignId: string
  defaultDesignName?: string
  barcodeItem: boolean
  barcodeType: string
  labourChargesBy: string
  salePurchaseBy: string
  gstHsnCode: string
  fixedWeightPerPcs: number
  defaultTanch?: number
  defaultWastage?: number
  defaultLabourRate?: number
  labourRateType?: LabourRateType
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type FirmRecord = {
  id: string
  firmName: string
  tagline: string
  address: string
  city: string
  state: string
  mobileNumber: string
  gstNo: string
  panNo: string
  termsAndConditions: string
  businessType: BusinessTypeConstant
}

export type UserRecord = {
  id: string
  username: string
  fullName: string
  role: UserRole
  active: boolean
  createdAt: string
  updatedAt: string
}

export type FinancialYearRecord = {
  id: string
  yearLabel: string
  startDate: string
  endDate: string
  isCurrent: boolean
  isClosed: boolean
  narration: string
  createdAt: string
  updatedAt: string
}
