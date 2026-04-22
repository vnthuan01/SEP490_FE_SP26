/* ================= TYPES ================= */

export interface ExportItem {
  id: string;
  name: string;
  category: string;
  icon?: string;
  current: number;
  capacity: number;
  unit: string;
  quantity?: number;
  status?: 'normal' | 'warning' | 'danger';
}

export interface Team {
  id: string;
  name: string;
}

/** A campaign option shown in the campaign-allocation dialog */
export interface CampaignOption {
  id: string;
  name: string;
  status?: number;
  statusLabel?: string;
}

export interface ExportInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ExportItem[];
  teams: Team[];
  onSubmit: (items: ExportItem[], note: string, teamId: string) => void;
}

/** Props for the campaign-allocation variant of the export dialog */
export interface CampaignAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ExportItem[];
  campaigns: CampaignOption[];
  selectedCampaignId?: string;
  onSubmit: (items: ExportItem[], note: string, campaignId: string) => Promise<boolean>;
}
