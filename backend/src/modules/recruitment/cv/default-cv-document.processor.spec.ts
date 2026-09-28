import { describe, it, expect } from 'vitest';
import { DefaultCvDocumentProcessor } from './default-cv-document.processor.js';

describe('DefaultCvDocumentProcessor', () => {
  const processor = new DefaultCvDocumentProcessor();

  it('extracts embedded plain text markers from uploaded CV buffer', async () => {
    const text = '---CV-TEXT-START---\nJane Doe\njane@example.com\nSkills: React, Node\n5 years experience\n---CV-TEXT-END---';
    const result = await processor.process({
      fileName: 'cv.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(text),
    });
    expect(result.extractedText).toContain('React');
    expect(result.parsedProfile.email).toBe('jane@example.com');
    expect(result.parsedProfile.skills).toContain('React');
  });
});
