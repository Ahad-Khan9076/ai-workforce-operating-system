import { CertificateStatus } from '@prisma/client';

export function resolveCertificateStatus(
  expiresAt: Date | null | undefined,
  now = new Date(),
): CertificateStatus {
  if (!expiresAt) return CertificateStatus.ACTIVE;
  if (expiresAt < now) return CertificateStatus.EXPIRED;
  const thirtyDays = 30 * 86400000;
  if (expiresAt.getTime() - now.getTime() <= thirtyDays) {
    return CertificateStatus.EXPIRING;
  }
  return CertificateStatus.ACTIVE;
}
