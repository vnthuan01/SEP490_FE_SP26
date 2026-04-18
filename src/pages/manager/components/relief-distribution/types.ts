import type {
  CreateDistributionPointRequest,
  CreateReliefPackageDefinitionRequest,
  ReliefHouseholdInputRequest,
} from '@/services/reliefDistributionService';

export type HouseholdSampleForm = ReliefHouseholdInputRequest;
export type PackageItemForm = { supplyItemId: string; quantity: string; unit: string };

export type DistributionPointForm = CreateDistributionPointRequest;
export type PackageForm = CreateReliefPackageDefinitionRequest;
