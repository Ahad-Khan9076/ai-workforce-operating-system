import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CvDocumentProcessor,
  type ParsedCandidateProfile,
} from './cv-document-processor.interface.js';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

@Injectable()
export class DefaultCvDocumentProcessor extends CvDocumentProcessor {
  async extractText(input: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<string> {
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new BadRequestException('Unsupported CV format. Use PDF, DOC, DOCX, or plain text.');
    }

    if (input.mimeType === 'text/plain') {
      return input.buffer.toString('utf8');
    }

    // Production: plug in pdf-parse / mammoth etc. For now decode embedded text markers in dev uploads.
    const marker = input.buffer.toString('utf8');
    if (marker.includes('---CV-TEXT-START---')) {
      return marker.split('---CV-TEXT-START---')[1]?.split('---CV-TEXT-END---')[0]?.trim() ?? '';
    }

    return `[extracted-from-${input.fileName}] ${input.buffer.toString('utf8', 0, Math.min(input.buffer.length, 8000))}`;
  }

  normalize(extractedText: string): ParsedCandidateProfile {
    const email = extractedText.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0];
    const phone = extractedText.match(/\+?\d[\d\s()-]{7,}/)?.[0]?.trim();
    const skillsSection = extractedText.match(/skills?[:\s]+([\s\S]*?)(education|experience|$)/i)?.[1];
    const skills = skillsSection
      ? skillsSection
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 1 && s.length < 40)
          .slice(0, 20)
      : [];

    const yearsMatch = extractedText.match(/(\d+(?:\.\d+)?)\+?\s*years?\s*(?:of\s*)?experience/i);
    const education = extractedText.match(/education[:\s]+([\s\S]*?)(skills|experience|$)/i)?.[1]
      ?.split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 5);

    return {
      email,
      phone,
      skills,
      experienceYears: yearsMatch ? Number(yearsMatch[1]) : undefined,
      education,
      summary: extractedText.slice(0, 500).trim(),
    };
  }
}
