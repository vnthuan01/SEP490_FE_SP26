export type SelectOption = {
  label: string;
  value: string;
};

export type ReliefAdvancedFiltersValue = {
  search: string;
  assignment?: 'all' | 'assigned' | 'unassigned';
  deliveryMode?: number;
  reliefPackageDefinitionId?: string;
  hasMultiplePackages?: boolean;
  teamId?: string;
  distributionPointId?: string;
  status?: number;
  isIsolated?: boolean;
  requiresBoat?: boolean;
  requiresLocalGuide?: boolean;
  minFloodSeverityLevel?: number;
  minIsolationSeverityLevel?: number;
  hasCoordinates?: boolean;
};
