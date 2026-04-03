export interface NewInventoryItem {
  supplyItemId: string;
  name: string;
  category: string;
  icon?: string;
  unit: string;
  quantity: number;
  capacity?: number;
  note?: string;
  /** Expiration date for the new stock lot (ISO string or null). Only used for new (non-existing) stock rows. */
  expirationDate?: string | null;
}

export interface ItemInventoryProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplyItems?: Array<{
    id: string;
    name: string;
    category: string;
    icon?: string;
    unit: string;
  }>;
  initialSupplyItemId?: string;
  existingStock?: {
    currentQuantity: number;
    minimumStockLevel: number;
    maximumStockLevel: number;
  } | null;
  onSubmit: (item: NewInventoryItem) => void;
}
