// Type declarations for R2 Regime Visualization Browser

export interface IdentityRole {
  roleName: string;
  agentId: string;
  responsibility: string;
  model: string;
}

export interface IdentityData {
  id: string;
  region: string;
  raw: string | null;
}
