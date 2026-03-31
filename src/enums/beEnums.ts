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

export const InventoryStatus = {
  Critical: 1,
  NeedRestock: 2,
  Safe: 3,
  Full: 4,
} as const;

export type InventoryStatus = (typeof InventoryStatus)[keyof typeof InventoryStatus];

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
