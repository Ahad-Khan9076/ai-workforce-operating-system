export interface ParsedCandidateProfile {
  fullName?: string;
  email?: string;
  phone?: string;
  skills: string[];
  experienceYears?: number;
  education?: string[];
  summary?: string;
}

export interface CvExtractionResult {
  extractedText: string;
  parsedProfile: ParsedCandidateProfile;
}

export abstract class CvDocumentProcessor {
  abstract extractText(input: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<string>;

  abstract normalize(extractedText: string): ParsedCandidateProfile;

  async process(input: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<CvExtractionResult> {
    const extractedText = await this.extractText(input);
    const parsedProfile = this.normalize(extractedText);
    return { extractedText, parsedProfile };
  }
}
