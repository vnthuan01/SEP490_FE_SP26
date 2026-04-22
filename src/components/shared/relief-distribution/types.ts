export type SelectOption = {
  label: string;
  value: string;
};

export type ReliefAdvancedFiltersValue = {
  search: string;
  assignment?: 'all' | 'assigned' | 'unassigned';
  deliveryMode?: number;
  teamId?: string;
  distributionPointId?: string;
  status?: number;
  isIsolated?: boolean;
};
