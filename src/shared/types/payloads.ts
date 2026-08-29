import type { BusinessTypeConstant } from '../constants/business'
import type { UserRole } from '../constants/roles'

export type AuthState = {
  registered: boolean
  username: string | null
  businessType: BusinessTypeConstant | null
  authenticated: boolean
}

export type AuthSession = {
  userId: string
  username: string
  role: UserRole
  businessType: BusinessTypeConstant
}

export type RegisterPayload = {
  username: string
  password: string
  firmName: string
  businessType: BusinessTypeConstant
}

export type LoginPayload = {
  username: string
  password: string
}

export type ChangePasswordPayload = {
  currentPassword: string
  newPassword: string
}

export type AccountGroupPayload = {
  groupName: string
  groupType: string
  description: string
  active: boolean
}

export type AccountPayload = {
  accountName: string
  otherName: string
  accountType: string
  accountGroupId: string
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
}

export type UserPayload = {
  username: string
  password?: string
  fullName: string
  role: UserRole
  active: boolean
}

export type FinancialYearPayload = {
  yearLabel: string
  startDate: string
  endDate: string
  narration?: string
}
