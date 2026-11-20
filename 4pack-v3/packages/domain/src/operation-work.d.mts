export type OperationTaskInput = {
  chinaOrigin?: {state:string;handoff:string;revisionPending?:boolean;economicAdjustment?:boolean};
  role: "importer" | "operator" | "admin";
  phase: string;
  paymentMode?: string;
  paymentApproved: boolean;
  openClaims?: number;
  deliveryProof?: boolean;
  deliveryConfirmed?: boolean;
  requiredDocuments?: string[] | null;
  documents?: { type: string; status: string }[];
  protectionState?: string | null;
};
export type OperationTask = {
  label: string;
  responsible: "importer" | "operator" | "admin" | "none";
  action: string;
  documentType: string | null;
  tone: "green" | "orange";
};
export function deriveOperationTask(input: OperationTaskInput): OperationTask;
