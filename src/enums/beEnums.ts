/**
 * beEnums.ts
 * TypeScript mirror của toàn bộ C# enum trong ReliefManagementSystem.Domain.Enum
 * Giữ nguyên numeric value để match với API response.
 */

// ─── Rescue Request ────────────────────────────────────────────────────────────

export const RescueRequestStatus = {
  Pending: 0,
  Verified: 1,
  Assigned: 2,
  InProgress: 3,
  Completed: 4,
  Cancelled: 5,
} as const;

export type RescueRequestStatus = (typeof RescueRequestStatus)[keyof typeof RescueRequestStatus];

export const RescueRequestType = {
  Normal: 0, // Cần xác minh trước khi dispatch
  Emergency: 1, // Bypass xác minh, dispatch ngay
} as const;

export type RescueRequestType = (typeof RescueRequestType)[keyof typeof RescueRequestType];

// ─── Request Verification ──────────────────────────────────────────────────────

/** ⚠ Bắt đầu từ 0 (dùng cho verifications[0].status trong RescueRequest) */
export const RequestVerificationStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
} as const;

export type RequestVerificationStatus =
  (typeof RequestVerificationStatus)[keyof typeof RequestVerificationStatus];

/** ⚠ Bắt đầu từ 1 (dùng cho VerificationStatus riêng biệt) */
export const VerificationStatus = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
} as const;

export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const VerificationMethod = {
  None: 0,
  ManualReview: 1,
  PhoneCall: 2,
  PhotoEvidence: 3,
  FieldVerification: 4,
  SystemAutoCheck: 5,
} as const;

export type VerificationMethod = (typeof VerificationMethod)[keyof typeof VerificationMethod];

export const VerificationResult = {
  Pending: 0,
  Confirmed: 1,
  Failed: 2,
} as const;

export type VerificationResult = (typeof VerificationResult)[keyof typeof VerificationResult];

// ─── Team ──────────────────────────────────────────────────────────────────────

export const TeamStatus = {
  Draft: 0,
  Active: 1,
  Inactive: 2,
  Suspended: 3,
  Archived: 4,
} as const;

export type TeamStatus = (typeof TeamStatus)[keyof typeof TeamStatus];

/** ⚠ Bắt đầu từ 1 */
export const TeamRole = {
  Leader: 1,
  Member: 2,
} as const;

export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];

/** ⚠ Bắt đầu từ 1 */
export const TeamRolePreference = {
  Member: 1,
  Leader: 2,
  Driver: 3,
} as const;

export type TeamRolePreference = (typeof TeamRolePreference)[keyof typeof TeamRolePreference];

export const TeamJoinRequestStatus = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Cancelled: 4,
} as const;

export type TeamJoinRequestStatus =
  (typeof TeamJoinRequestStatus)[keyof typeof TeamJoinRequestStatus];

// ─── Relief Station ────────────────────────────────────────────────────────────

export const ReliefStationStatus = {
  Draft: 0,
  Active: 1,
  Inactive: 2,
  Closed: 3,
} as const;

export type ReliefStationStatus = (typeof ReliefStationStatus)[keyof typeof ReliefStationStatus];

export const ReliefStationLevel = {
  Regional: 1,
  Provincial: 2,
  Local: 3,
} as const;

export type ReliefStationLevel = (typeof ReliefStationLevel)[keyof typeof ReliefStationLevel];

export const ReliefTeamAssignmentStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Removed: 3,
} as const;

export type ReliefTeamAssignmentStatus =
  (typeof ReliefTeamAssignmentStatus)[keyof typeof ReliefTeamAssignmentStatus];

export const StationJoinRequestStatus = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Cancelled: 4,
} as const;

export type StationJoinRequestStatus =
  (typeof StationJoinRequestStatus)[keyof typeof StationJoinRequestStatus];

// ─── Volunteer ─────────────────────────────────────────────────────────────────

/** ⚠ Bắt đầu từ 1 */
export const VolunteerStatus = {
  Active: 1,
  Inactive: 2,
} as const;

export type VolunteerStatus = (typeof VolunteerStatus)[keyof typeof VolunteerStatus];

/** ⚠ Bắt đầu từ 1 */
export const VolunteerType = {
  Permanent: 1,
  Campaign: 2,
} as const;

export type VolunteerType = (typeof VolunteerType)[keyof typeof VolunteerType];

// ─── Rescue Operations ─────────────────────────────────────────────────────────

export const RescueOperationStatus = {
  Pending: 0,
  Assigned: 1,
  EnRoute: 2,
  Rescuing: 3,
  RescueCompleted: 4,
  Returning: 5,
  Closed: 6,
  Cancelled: 7,
} as const;

export type RescueOperationStatus =
  (typeof RescueOperationStatus)[keyof typeof RescueOperationStatus];

export const RescueBatchStatus = {
  Planning: 0,
  Active: 1,
  Completed: 2,
  Cancelled: 3,
} as const;

export type RescueBatchStatus = (typeof RescueBatchStatus)[keyof typeof RescueBatchStatus];

export const RescueBatchItemStatus = {
  Pending: 0,
  InProgress: 1,
  Done: 2,
  Cancelled: 3,
} as const;

export type RescueBatchItemStatus =
  (typeof RescueBatchItemStatus)[keyof typeof RescueBatchItemStatus];

export const RescuePriorityLevel = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
} as const;

export type RescuePriorityLevel = (typeof RescuePriorityLevel)[keyof typeof RescuePriorityLevel];

// ─── Disaster / Urgency ────────────────────────────────────────────────────────

export const DisasterType = {
  Flood: 0,
  Landslide: 1,
  Earthquake: 2,
  Fire: 3,
  Storm: 4,
  Other: 5,
} as const;

export type DisasterType = (typeof DisasterType)[keyof typeof DisasterType];

export const UrgencyLevel = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
} as const;

export type UrgencyLevel = (typeof UrgencyLevel)[keyof typeof UrgencyLevel];

// ─── Request (generic) ─────────────────────────────────────────────────────────

export const RequestStatus = {
  Draft: 0,
  Submitted: 1,
  Verified: 2,
  Rejected: 3,
  InProgress: 4,
  Resolved: 5,
  Cancelled: 6,
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const RequestType = {
  Relief: 0,
  Rescue: 1,
} as const;

export type RequestType = (typeof RequestType)[keyof typeof RequestType];

export const ReliefRequestStatus = {
  Pending: 0,
  Verified: 1,
  Approved: 2,
  Allocated: 3,
  Delivered: 4,
  Completed: 5,
  Rejected: 6,
} as const;

export type ReliefRequestStatus = (typeof ReliefRequestStatus)[keyof typeof ReliefRequestStatus];

// ─── User / Role / Moderator ───────────────────────────────────────────────────

export const UserStatus = {
  Active: 0,
  Inactive: 1,
  Suspended: 2,
  Deleted: 3,
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const ModeratorStatus = {
  Active: 1,
  Inactive: 2,
  Suspended: 3,
  Dismissed: 4,
} as const;

export type ModeratorStatus = (typeof ModeratorStatus)[keyof typeof ModeratorStatus];

export const Role = {
  Admin: 0,
  User: 1,
  Volunteer: 2,
  Moderator: 3,
  Manager: 4,
} as const;

export type Role = (typeof Role)[keyof typeof Role];

// ─── Entity generic ────────────────────────────────────────────────────────────

export const EntityStatus = {
  Inactive: 0,
  Active: 1,
  Deleted: 2,
} as const;

export type EntityStatus = (typeof EntityStatus)[keyof typeof EntityStatus];

// ─── Dispatch ──────────────────────────────────────────────────────────────────

export const DispatchMode = {
  SingleStationRadius: 0,
  NearestStation: 1,
  MultipleStations: 2,
} as const;

export type DispatchMode = (typeof DispatchMode)[keyof typeof DispatchMode];

// ─── Supply / Inventory ────────────────────────────────────────────────────────

export const InventoryLevel = {
  Regional: 1,
  Provincial: 2,
} as const;

export type InventoryLevel = (typeof InventoryLevel)[keyof typeof InventoryLevel];

export const SupplyCategory = {
  LuongThuc: 1,
  YTeVaThuoc: 2,
  NuocUong: 3,
  DungCuVaLeuTrai: 4,
  Khac: 99,
} as const;

export type SupplyCategory = (typeof SupplyCategory)[keyof typeof SupplyCategory];

export const SupplyAllocationStatus = {
  Pending: 0,
  Approved: 1,
  Delivered: 2,
  Cancelled: 3,
} as const;

export type SupplyAllocationStatus =
  (typeof SupplyAllocationStatus)[keyof typeof SupplyAllocationStatus];

export const SupplyCategoryLabel: Record<SupplyCategory, string> = {
  [SupplyCategory.LuongThuc]: 'Lương thực',
  [SupplyCategory.YTeVaThuoc]: 'Y tế và thuốc',
  [SupplyCategory.NuocUong]: 'Nước uống',
  [SupplyCategory.DungCuVaLeuTrai]: 'Dụng cụ và lều trại',
  [SupplyCategory.Khac]: 'Khác',
};

export const SupplyCategoryIcon: Record<SupplyCategory, string> = {
  [SupplyCategory.LuongThuc]: 'restaurant',
  [SupplyCategory.YTeVaThuoc]: 'medication',
  [SupplyCategory.NuocUong]: 'water_drop',
  [SupplyCategory.DungCuVaLeuTrai]: 'camping',
  [SupplyCategory.Khac]: 'category',
};

export const SupplyCategoryClass: Record<SupplyCategory, string> = {
  [SupplyCategory.LuongThuc]:
    'border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-300',
  [SupplyCategory.YTeVaThuoc]: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300',
  [SupplyCategory.NuocUong]: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300',
  [SupplyCategory.DungCuVaLeuTrai]:
    'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-300',
  [SupplyCategory.Khac]: 'border-border bg-muted text-muted-foreground',
};

export const SupplyAllocationStatusLabel: Record<SupplyAllocationStatus, string> = {
  [SupplyAllocationStatus.Pending]: 'Chờ duyệt',
  [SupplyAllocationStatus.Approved]: 'Đã duyệt',
  [SupplyAllocationStatus.Delivered]: 'Đã giao',
  [SupplyAllocationStatus.Cancelled]: 'Đã hủy',
};

export const SupplyTransferStatus = {
  Pending: 1,
  Approved: 2,
  Shipping: 3,
  Received: 4,
  Cancelled: 5,
} as const;

export type SupplyTransferStatus = (typeof SupplyTransferStatus)[keyof typeof SupplyTransferStatus];

export const ProcurementStatus = {
  Draft: 1,
  Approved: 2,
  Ordered: 3,
  Received: 4,
  Cancelled: 5,
} as const;

export type ProcurementStatus = (typeof ProcurementStatus)[keyof typeof ProcurementStatus];

export const TransactionType = {
  Import: 1,
  Export: 2,
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionReason = {
  Donation: 1,
  SupplyTransferIn: 2,
  SupplyTransferOut: 3,
  CampaignAllocation: 4,
  Other: 5,
  Procurement: 6,
} as const;

export type TransactionReason = (typeof TransactionReason)[keyof typeof TransactionReason];

// ─── Campaign ──────────────────────────────────────────────────────────────────

export const CampaignStatus = {
  Draft: 0,
  Active: 1,
  Suspended: 2,
  Completed: 3,
  Cancelled: 4,
  GoalsMet: 5,
  ReadyToExecute: 6,
  InProgress: 7,
  Closing: 8,
} as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const CampaignType = {
  Fundraising: 1,
  Relief: 2,
  Rescue: 3,
} as const;

export type CampaignType = (typeof CampaignType)[keyof typeof CampaignType];

export const CampaignTeamStatus = {
  Invited: 0,
  Accepted: 1,
  Active: 2,
  Completed: 3,
  Withdrawn: 4,
  Cancelled: 5,
} as const;

export type CampaignTeamStatus = (typeof CampaignTeamStatus)[keyof typeof CampaignTeamStatus];

export const CampaignTeamRole = {
  Logistics: 0,
  Medical: 1,
  Relief: 2,
  Communication: 3,
  Support: 4,
} as const;

export type CampaignTeamRole = (typeof CampaignTeamRole)[keyof typeof CampaignTeamRole];

export const CampaignTaskStatus = {
  Planned: 0,
  InProgress: 1,
  Blocked: 2,
  Completed: 3,
  Cancelled: 4,
} as const;

export type CampaignTaskStatus = (typeof CampaignTaskStatus)[keyof typeof CampaignTaskStatus];

// ─── Vehicle ───────────────────────────────────────────────────────────────────

export const VehicleStatus = {
  Free: 1,
  Busy: 2,
} as const;

export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const VehicleAssignmentStatus = {
  Pending: 0,
  Approved: 1,
  InTransit: 2,
  OnSite: 3,
  Returning: 4,
  Completed: 5,
  Canceled: 6,
  Incident: 7,
} as const;

export type VehicleAssignmentStatus =
  (typeof VehicleAssignmentStatus)[keyof typeof VehicleAssignmentStatus];

// ─── Donation ──────────────────────────────────────────────────────────────────

export const DonationStatus = {
  Pending: 0,
  Completed: 1,
  Failed: 2,
  Cancelled: 3,
  Expired: 4,
  Refunded: 5,
} as const;

export type DonationStatus = (typeof DonationStatus)[keyof typeof DonationStatus];

// ─── Need / NeedType ───────────────────────────────────────────────────────────

/** ⚠ Bắt đầu từ 1 */
export const NeedType = {
  Food: 1,
  Medical: 2,
  Rescue: 3,
  Shelter: 4,
} as const;

export type NeedType = (typeof NeedType)[keyof typeof NeedType];

// ─── Label helpers ─────────────────────────────────────────────────────────────

export const RescueRequestStatusLabel: Record<RescueRequestStatus, string> = {
  [RescueRequestStatus.Pending]: 'Chờ xử lý',
  [RescueRequestStatus.Verified]: 'Đã xác minh',
  [RescueRequestStatus.Assigned]: 'Đã gán đội',
  [RescueRequestStatus.InProgress]: 'Đang cứu hộ',
  [RescueRequestStatus.Completed]: 'Hoàn thành',
  [RescueRequestStatus.Cancelled]: 'Đã huỷ',
};

export const RescueRequestTypeLabel: Record<RescueRequestType, string> = {
  [RescueRequestType.Normal]: 'Cứu hộ thông thường',
  [RescueRequestType.Emergency]: 'Cứu hộ khẩn cấp',
};

export const RequestVerificationStatusLabel: Record<RequestVerificationStatus, string> = {
  [RequestVerificationStatus.Pending]: 'Chờ xác minh',
  [RequestVerificationStatus.Approved]: 'Đã xác minh',
  [RequestVerificationStatus.Rejected]: 'Từ chối',
};

export const VerificationMethodLabel: Record<VerificationMethod, string> = {
  [VerificationMethod.None]: 'Không chọn',
  [VerificationMethod.ManualReview]: 'Duyệt thủ công',
  [VerificationMethod.PhoneCall]: 'Gọi điện xác minh',
  [VerificationMethod.PhotoEvidence]: 'Đối chiếu hình ảnh',
  [VerificationMethod.FieldVerification]: 'Xác minh hiện trường',
  [VerificationMethod.SystemAutoCheck]: 'Hệ thống tự kiểm tra',
};

export const TeamStatusLabel: Record<TeamStatus, string> = {
  [TeamStatus.Draft]: 'Nháp',
  [TeamStatus.Active]: 'Đang hoạt động',
  [TeamStatus.Inactive]: 'Không hoạt động',
  [TeamStatus.Suspended]: 'Đình chỉ',
  [TeamStatus.Archived]: 'Lưu trữ',
};

export const ReliefStationStatusLabel: Record<ReliefStationStatus, string> = {
  [ReliefStationStatus.Draft]: 'Nháp',
  [ReliefStationStatus.Active]: 'Đang hoạt động',
  [ReliefStationStatus.Inactive]: 'Không hoạt động',
  [ReliefStationStatus.Closed]: 'Đã đóng',
};

export const ReliefStationLevelLabel: Record<ReliefStationLevel, string> = {
  [ReliefStationLevel.Regional]: 'Khu vực',
  [ReliefStationLevel.Provincial]: 'Tỉnh / Thành phố',
  [ReliefStationLevel.Local]: 'Địa phương',
};

export const InventoryLevelLabel: Record<InventoryLevel, string> = {
  [InventoryLevel.Regional]: 'Kho khu vực',
  [InventoryLevel.Provincial]: 'Kho tỉnh / thành phố',
};

export const InventoryLevelIcon: Record<InventoryLevel, string> = {
  [InventoryLevel.Regional]: 'warehouse',
  [InventoryLevel.Provincial]: 'inventory_2',
};

export const InventoryLevelClass: Record<InventoryLevel, string> = {
  [InventoryLevel.Regional]:
    'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  [InventoryLevel.Provincial]: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

export const EntityStatusLabel: Record<EntityStatus, string> = {
  [EntityStatus.Inactive]: 'Không hoạt động',
  [EntityStatus.Active]: 'Đang hoạt động',
  [EntityStatus.Deleted]: 'Đã xoá',
};

export const EntityStatusIcon: Record<EntityStatus, string> = {
  [EntityStatus.Inactive]: 'pause_circle',
  [EntityStatus.Active]: 'verified',
  [EntityStatus.Deleted]: 'delete',
};

export const CampaignStatusIcon: Record<CampaignStatus, string> = {
  [CampaignStatus.Draft]: 'edit_note',
  [CampaignStatus.Active]: 'rocket_launch',
  [CampaignStatus.Suspended]: 'pause_circle',
  [CampaignStatus.Completed]: 'check_circle',
  [CampaignStatus.Cancelled]: 'cancel',
  [CampaignStatus.GoalsMet]: 'emoji_events',
  [CampaignStatus.ReadyToExecute]: 'task_alt',
  [CampaignStatus.InProgress]: 'deployed_code_history',
  [CampaignStatus.Closing]: 'hourglass_top',
};

export const CampaignStatusShortLabel: Record<CampaignStatus, string> = {
  [CampaignStatus.Draft]: 'Bản nháp',
  [CampaignStatus.Active]: 'Đang hoạt động',
  [CampaignStatus.Suspended]: 'Tạm dừng',
  [CampaignStatus.Completed]: 'Hoàn thành',
  [CampaignStatus.Cancelled]: 'Đã hủy',
  [CampaignStatus.GoalsMet]: 'Đạt mục tiêu',
  [CampaignStatus.ReadyToExecute]: 'Sẵn sàng triển khai',
  [CampaignStatus.InProgress]: 'Đang triển khai',
  [CampaignStatus.Closing]: 'Đang kết thúc',
};

export const CampaignStatusLabel: Record<CampaignStatus, string> = {
  [CampaignStatus.Draft]: 'Nháp',
  [CampaignStatus.Active]: 'Đang hoạt động',
  [CampaignStatus.Suspended]: 'Tạm dừng',
  [CampaignStatus.Completed]: 'Hoàn thành',
  [CampaignStatus.Cancelled]: 'Đã huỷ',
  [CampaignStatus.GoalsMet]: 'Đạt mục tiêu',
  [CampaignStatus.ReadyToExecute]: 'Sẵn sàng triển khai',
  [CampaignStatus.InProgress]: 'Đang triển khai',
  [CampaignStatus.Closing]: 'Đang kết thúc',
};

export const CampaignTypeLabel: Record<CampaignType, string> = {
  [CampaignType.Fundraising]: 'Gây quỹ',
  [CampaignType.Relief]: 'Cứu trợ',
  [CampaignType.Rescue]: 'Cứu hộ',
};

export const DisasterTypeLabel: Record<DisasterType, string> = {
  [DisasterType.Flood]: 'Lũ lụt',
  [DisasterType.Landslide]: 'Sạt lở đất',
  [DisasterType.Earthquake]: 'Động đất',
  [DisasterType.Fire]: 'Cháy rừng / Hoả hoạn',
  [DisasterType.Storm]: 'Bão',
  [DisasterType.Other]: 'Khác',
};

export const VolunteerStatusLabel: Record<VolunteerStatus, string> = {
  [VolunteerStatus.Active]: 'Đang hoạt động',
  [VolunteerStatus.Inactive]: 'Không hoạt động',
};

export const VolunteerTypeLabel: Record<VolunteerType, string> = {
  [VolunteerType.Permanent]: 'Thường trực',
  [VolunteerType.Campaign]: 'Theo chiến dịch',
};

export const TeamRolePreferenceLabel: Record<TeamRolePreference, string> = {
  [TeamRolePreference.Member]: 'Thành viên',
  [TeamRolePreference.Leader]: 'Đội trưởng',
  [TeamRolePreference.Driver]: 'Tài xế',
};

export const VerificationStatusLabel: Record<VerificationStatus, string> = {
  [VerificationStatus.Pending]: 'Chờ duyệt',
  [VerificationStatus.Approved]: 'Đã duyệt',
  [VerificationStatus.Rejected]: 'Từ chối',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Parse giá trị số hoặc string từ API về đúng enum number */
export function parseEnumValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseInt(value, 10);
    if (!Number.isNaN(n)) return n;
  }
  return -1;
}

/** Trả label của DisasterType — handle cả number lẫn string từ BE */
export function getDisasterTypeLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in DisasterTypeLabel) return DisasterTypeLabel[n as DisasterType];
  // Fallback: nếu BE gửi chuỗi tên enum
  if (typeof value === 'string') {
    const key = value.trim();
    const found = Object.entries(DisasterType).find(([k]) => k === key);
    if (found) return DisasterTypeLabel[found[1] as DisasterType] ?? key;
    return key;
  }
  return 'Không rõ';
}

/** Trả label của RescueRequestType — handle cả number lẫn string từ BE */
export function getRescueRequestTypeLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in RescueRequestTypeLabel) return RescueRequestTypeLabel[n as RescueRequestType];
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'normal') return RescueRequestTypeLabel[RescueRequestType.Normal];
    if (v === 'emergency') return RescueRequestTypeLabel[RescueRequestType.Emergency];
    return value;
  }
  return 'Không rõ';
}

/** Trả label của RequestVerificationStatus — handle cả number lẫn string từ BE */
export function getVerificationStatusLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in RequestVerificationStatusLabel)
    return RequestVerificationStatusLabel[n as RequestVerificationStatus];
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'pending') return RequestVerificationStatusLabel[RequestVerificationStatus.Pending];
    if (v === 'approved') return RequestVerificationStatusLabel[RequestVerificationStatus.Approved];
    if (v === 'rejected') return RequestVerificationStatusLabel[RequestVerificationStatus.Rejected];
    return value;
  }
  return 'Không rõ';
}

/** Trả CSS class badge cho RequestVerificationStatus */
export function getVerificationStatusClass(value: unknown): string {
  const n = parseEnumValue(value);
  if (n === RequestVerificationStatus.Pending || value === 'Pending')
    return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  if (n === RequestVerificationStatus.Approved || value === 'Approved')
    return 'bg-green-500/10 text-green-600 border-green-500/20';
  if (n === RequestVerificationStatus.Rejected || value === 'Rejected')
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
}

/** Trả CSS class badge cho TeamStatus */
export function getTeamStatusClass(status: number): string {
  switch (status) {
    case TeamStatus.Draft:
      return 'bg-slate-500/20 text-slate-500';
    case TeamStatus.Active:
      return 'bg-green-500/20 text-green-500';
    case TeamStatus.Inactive:
      return 'bg-gray-500/20 text-gray-500';
    case TeamStatus.Suspended:
      return 'bg-red-500/20 text-red-500';
    case TeamStatus.Archived:
      return 'bg-yellow-500/20 text-yellow-600';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

/** Trả CSS class badge cho ReliefStationStatus */
export function getReliefStationStatusClass(status: number): string {
  switch (status) {
    case ReliefStationStatus.Draft:
      return 'bg-slate-500/20 text-slate-500';
    case ReliefStationStatus.Active:
      return 'bg-green-500/20 text-green-500';
    case ReliefStationStatus.Inactive:
      return 'bg-gray-500/20 text-gray-500';
    case ReliefStationStatus.Closed:
      return 'bg-red-500/20 text-red-500';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

export function getInventoryLevelLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in InventoryLevelLabel) return InventoryLevelLabel[n as InventoryLevel];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'regional') return InventoryLevelLabel[InventoryLevel.Regional];
    if (normalized === 'provincial') return InventoryLevelLabel[InventoryLevel.Provincial];
    return value;
  }

  return 'Không rõ';
}

export function getInventoryLevelIcon(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in InventoryLevelIcon) return InventoryLevelIcon[n as InventoryLevel];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'regional') return InventoryLevelIcon[InventoryLevel.Regional];
    if (normalized === 'provincial') return InventoryLevelIcon[InventoryLevel.Provincial];
  }

  return 'layers';
}

export function getInventoryLevelClass(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in InventoryLevelClass) return InventoryLevelClass[n as InventoryLevel];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'regional') return InventoryLevelClass[InventoryLevel.Regional];
    if (normalized === 'provincial') return InventoryLevelClass[InventoryLevel.Provincial];
  }

  return 'border-border bg-muted/50 text-muted-foreground';
}

export function getSupplyCategoryLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in SupplyCategoryLabel) return SupplyCategoryLabel[n as SupplyCategory];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'luongthuc') return SupplyCategoryLabel[SupplyCategory.LuongThuc];
    if (normalized === 'ytevathuoc') return SupplyCategoryLabel[SupplyCategory.YTeVaThuoc];
    if (normalized === 'nuocuong') return SupplyCategoryLabel[SupplyCategory.NuocUong];
    if (normalized === 'dungcuvaleutrai')
      return SupplyCategoryLabel[SupplyCategory.DungCuVaLeuTrai];
    if (normalized === 'khac') return SupplyCategoryLabel[SupplyCategory.Khac];
    return value;
  }

  return 'Không rõ';
}

export function getSupplyCategoryIcon(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in SupplyCategoryIcon) return SupplyCategoryIcon[n as SupplyCategory];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'luongthuc') return SupplyCategoryIcon[SupplyCategory.LuongThuc];
    if (normalized === 'ytevathuoc') return SupplyCategoryIcon[SupplyCategory.YTeVaThuoc];
    if (normalized === 'nuocuong') return SupplyCategoryIcon[SupplyCategory.NuocUong];
    if (normalized === 'dungcuvaleutrai') return SupplyCategoryIcon[SupplyCategory.DungCuVaLeuTrai];
    if (normalized === 'khac') return SupplyCategoryIcon[SupplyCategory.Khac];
  }

  return 'category';
}

export function getSupplyCategoryClass(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in SupplyCategoryClass) return SupplyCategoryClass[n as SupplyCategory];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'luongthuc') return SupplyCategoryClass[SupplyCategory.LuongThuc];
    if (normalized === 'ytevathuoc') return SupplyCategoryClass[SupplyCategory.YTeVaThuoc];
    if (normalized === 'nuocuong') return SupplyCategoryClass[SupplyCategory.NuocUong];
    if (normalized === 'dungcuvaleutrai')
      return SupplyCategoryClass[SupplyCategory.DungCuVaLeuTrai];
    if (normalized === 'khac') return SupplyCategoryClass[SupplyCategory.Khac];
  }

  return 'border-border bg-muted text-muted-foreground';
}

export function getSupplyAllocationStatusLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in SupplyAllocationStatusLabel)
    return SupplyAllocationStatusLabel[n as SupplyAllocationStatus];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'pending')
      return SupplyAllocationStatusLabel[SupplyAllocationStatus.Pending];
    if (normalized === 'approved')
      return SupplyAllocationStatusLabel[SupplyAllocationStatus.Approved];
    if (normalized === 'delivered')
      return SupplyAllocationStatusLabel[SupplyAllocationStatus.Delivered];
    if (normalized === 'cancelled' || normalized === 'canceled')
      return SupplyAllocationStatusLabel[SupplyAllocationStatus.Cancelled];
    return value;
  }

  return 'Không rõ';
}

export function getSupplyAllocationStatusClass(status: number): string {
  switch (status) {
    case SupplyAllocationStatus.Pending:
      return 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300';
    case SupplyAllocationStatus.Approved:
      return 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300';
    case SupplyAllocationStatus.Delivered:
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
    case SupplyAllocationStatus.Cancelled:
      return 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300';
    default:
      return 'border border-border bg-muted/50 text-muted-foreground';
  }
}

export function getEntityStatusLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in EntityStatusLabel) return EntityStatusLabel[n as EntityStatus];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'inactive') return EntityStatusLabel[EntityStatus.Inactive];
    if (normalized === 'active') return EntityStatusLabel[EntityStatus.Active];
    if (normalized === 'deleted') return EntityStatusLabel[EntityStatus.Deleted];
    return value;
  }

  return 'Không rõ';
}

export function getEntityStatusClass(status: number): string {
  switch (status) {
    case EntityStatus.Inactive:
      return 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300';
    case EntityStatus.Active:
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
    case EntityStatus.Deleted:
      return 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300';
    default:
      return 'border border-border bg-muted/50 text-muted-foreground';
  }
}

export function getEntityStatusIcon(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in EntityStatusIcon) return EntityStatusIcon[n as EntityStatus];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'inactive') return EntityStatusIcon[EntityStatus.Inactive];
    if (normalized === 'active') return EntityStatusIcon[EntityStatus.Active];
    if (normalized === 'deleted') return EntityStatusIcon[EntityStatus.Deleted];
  }

  return 'help';
}

export function getCampaignStatusLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in CampaignStatusLabel) return CampaignStatusLabel[n as CampaignStatus];

  if (typeof value === 'string') {
    const normalized = value.trim();
    const matched = Object.entries(CampaignStatus).find(([key]) => key === normalized);
    if (matched) return CampaignStatusLabel[matched[1] as CampaignStatus];
    return value;
  }

  return 'Không rõ';
}

export function getCampaignStatusShortLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in CampaignStatusShortLabel) return CampaignStatusShortLabel[n as CampaignStatus];

  if (typeof value === 'string') {
    const normalized = value.trim();
    const matched = Object.entries(CampaignStatus).find(([key]) => key === normalized);
    if (matched) return CampaignStatusShortLabel[matched[1] as CampaignStatus];
    return value;
  }

  return 'Không rõ';
}

export function getCampaignTypeLabel(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in CampaignTypeLabel) return CampaignTypeLabel[n as CampaignType];

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'fundraising') return CampaignTypeLabel[CampaignType.Fundraising];
    if (normalized === 'relief') return CampaignTypeLabel[CampaignType.Relief];
    if (normalized === 'rescue') return CampaignTypeLabel[CampaignType.Rescue];
    return value;
  }

  return 'Không rõ';
}

export function getCampaignStatusClass(status: number): string {
  switch (status) {
    case CampaignStatus.Draft:
      return 'bg-slate-500/20 text-slate-500';
    case CampaignStatus.Active:
    case CampaignStatus.ReadyToExecute:
      return 'bg-green-500/20 text-green-500';
    case CampaignStatus.Suspended:
    case CampaignStatus.Closing:
      return 'bg-yellow-500/20 text-yellow-600';
    case CampaignStatus.InProgress:
      return 'bg-blue-500/20 text-blue-600';
    case CampaignStatus.Completed:
    case CampaignStatus.GoalsMet:
      return 'bg-emerald-500/20 text-emerald-600';
    case CampaignStatus.Cancelled:
      return 'bg-red-500/20 text-red-500';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

export function getCampaignStatusIcon(value: unknown): string {
  const n = parseEnumValue(value);
  if (n in CampaignStatusIcon) return CampaignStatusIcon[n as CampaignStatus];

  if (typeof value === 'string') {
    const normalized = value.trim();
    const matched = Object.entries(CampaignStatus).find(([key]) => key === normalized);
    if (matched) return CampaignStatusIcon[matched[1] as CampaignStatus];
  }

  return 'help';
}

/** Chuyển RescueRequestStatus → UI location status */
export function rescueStatusToLocationStatus(
  value: unknown,
): 'unassigned' | 'assigned' | 'on-the-way' | 'completed' | 'failed' {
  const n = parseEnumValue(value);
  switch (n) {
    case RescueRequestStatus.Pending:
    case RescueRequestStatus.Verified:
      return 'unassigned';
    case RescueRequestStatus.Assigned:
      return 'assigned';
    case RescueRequestStatus.InProgress:
      return 'on-the-way';
    case RescueRequestStatus.Completed:
      return 'completed';
    case RescueRequestStatus.Cancelled:
      return 'failed';
    default:
      return 'unassigned';
  }
}

/** Chuyển TeamStatus → UI team availability */
export function teamStatusToAvailability(
  value: unknown,
): 'available' | 'moving' | 'rescuing' | 'lost-contact' {
  const n = parseEnumValue(value);
  switch (n) {
    case TeamStatus.Active:
      return 'available';
    case TeamStatus.Inactive:
      return 'lost-contact';
    case TeamStatus.Suspended:
      return 'lost-contact';
    case TeamStatus.Archived:
      return 'lost-contact';
    default:
      return 'lost-contact';
  }
}
