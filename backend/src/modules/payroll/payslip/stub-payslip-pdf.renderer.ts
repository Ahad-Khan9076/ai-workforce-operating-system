import { Injectable } from '@nestjs/common';
import {
  PayslipPdfRenderer,
  type PayslipDocument,
  type PayslipPdfRenderResult,
} from './pdf-renderer.interface.js';

/**
 * Placeholder PDF pipeline — swap for a real renderer (e.g. Puppeteer, PDFKit)
 * without changing payroll domain services.
 */
@Injectable()
export class StubPayslipPdfRenderer extends PayslipPdfRenderer {
  async render(document: PayslipDocument): Promise<PayslipPdfRenderResult> {
    const storageKey = `payslips/${document.slipNumber}.pdf`;
    return {
      storageKey,
      mimeType: 'application/pdf',
    };
  }
}
