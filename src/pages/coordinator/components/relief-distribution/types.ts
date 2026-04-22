export type CoordinatorDistributionPointForm = {
  name: string;
  locationId: string;
  address: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export type CoordinatorPackageItemForm = {
  supplyItemId: string;
  quantity: number;
  unit: string;
};

export type CoordinatorPackageForm = {
  name: string;
  description: string;
  cashSupportAmount: string;
  isDefault: boolean;
  isActive: boolean;
  items: CoordinatorPackageItemForm[];
};

export type CoordinatorAssignForm = {
  campaignTeamId: string;
  reliefPackageDefinitionId: string;
  scheduledAt: string;
  notes: string;
};
