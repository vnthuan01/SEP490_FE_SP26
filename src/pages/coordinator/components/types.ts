// Relief Coordination Types

export interface ReliefLocation {
  id: string;
  coordinates: { lat: number; lng: number };
  locationName: string;
  address: string;
  province: string;
  urgency: 'high' | 'medium' | 'low';
  peopleCount: number;
  needs: {
    food: boolean;
    water: boolean;
    medicine: boolean;
    emergencyRescue: boolean;
  };
  status: 'unassigned' | 'assigned' | 'on-the-way' | 'completed' | 'failed';
  assignedTeamId?: string;
  lastUpdated: string;
  reportedAt: string;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;

  // AI-calculated fields
  dangerScore?: number; // 0-100
  priorityScore?: number; // 0-100
  distanceFromHQ?: {
    straightLine: number; // km
    byMotorcycle?: { distance: number; duration: number }; // meters, seconds
    byTruck?: { distance: number; duration: number };
    byHelicopter?: { distance: number; duration: number };
  };
}

export interface TeamMember {
  id: string;
  name: string;
  role: string; // e.g., 'Leader', 'Nurse', 'Driver', 'Logistics'
  avatar: string;
}

export interface Team {
  id: string;
  name: string;
  currentLocation: { lat: number; lng: number };
  vehicle: 'truck' | 'boat' | 'motorcycle' | 'helicopter';
  capacity: { people: number; cargo: number };
  hasMedical: boolean;
  members: number; // Keep for backward compatibility or easy count
  memberDetails?: TeamMember[]; // New field for detailed member list
  leader: string;
  contactPhone: string;
  status: 'available' | 'moving' | 'rescuing' | 'lost-contact';
  currentAssignment?: string;
  area?: string; // e.g., 'Lệ Thủy, Quảng Bình'
}

export interface Headquarters {
  name: string;
  coordinates: { lat: number; lng: number };
  address: string;
}

export interface VolunteerRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  age: number;
  gender: 'Nam' | 'Nữ' | 'Khác';
  address: string;
  location: string; // e.g. "Hà Nội"
  status: 'new' | 'viewed' | 'approved' | 'rejected';
  skills: string[];
  experience: string;
  submittedAt: string; // ISO string
  images: { url: string; caption?: string }[];
  readiness: {
    health: boolean;
    vehicle: boolean;
    travel: boolean;
    commitment: boolean; // true if agrees to min duration
  };
  notes?: string;
}
