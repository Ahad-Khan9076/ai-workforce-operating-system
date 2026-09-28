import { describe, it, expect } from 'vitest';
import { CertificateStatus } from '@prisma/client';
import { resolveCertificateStatus } from './certificate-status.util.js';

describe('resolveCertificateStatus', () => {
  const now = new Date('2025-06-01T00:00:00.000Z');

  it('marks expired certificates', () => {
    expect(
      resolveCertificateStatus(new Date('2025-01-01T00:00:00.000Z'), now),
    ).toBe(CertificateStatus.EXPIRED);
  });

  it('marks expiring within 30 days', () => {
    expect(
      resolveCertificateStatus(new Date('2025-06-20T00:00:00.000Z'), now),
    ).toBe(CertificateStatus.EXPIRING);
  });

  it('marks active when far from expiry', () => {
    expect(
      resolveCertificateStatus(new Date('2026-06-01T00:00:00.000Z'), now),
    ).toBe(CertificateStatus.ACTIVE);
  });
});
