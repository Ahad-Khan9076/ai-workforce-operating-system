export interface PayslipDocument {
  slipNumber: string;
  organizationName: string;
  employee: {
    name: string;
    employeeNumber: string;
    department?: string | null;
  };
  period: { name: string; startDate: string; endDate: string };
  currency: string;
  basicSalary: number;
  earnings: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  overtimeTotal: number;
  taxTotal: number;
  grossAmount: number;
  netAmount: number;
}

export interface PayslipPdfRenderResult {
  storageKey: string;
  mimeType: string;
}

export abstract class PayslipPdfRenderer {
  abstract render(document: PayslipDocument): Promise<PayslipPdfRenderResult>;
}
