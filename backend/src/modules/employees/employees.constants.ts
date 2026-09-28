import type { Prisma } from '@prisma/client';

export const employeeListInclude = {
  jobTitle: true,
  department: true,
  team: true,
  manager: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} satisfies Prisma.EmployeeInclude;

export const employeeDetailInclude = {
  ...employeeListInclude,
  position: { include: { jobTitle: true, department: true, team: true } },
  membership: { include: { user: { select: { id: true, email: true } }, role: true } },
  employeeSkills: { include: { skill: { include: { category: true } } } },
  documents: { orderBy: { uploadedAt: 'desc' as const } },
  timelineEvents: { orderBy: { occurredAt: 'desc' as const }, take: 20 },
} satisfies Prisma.EmployeeInclude;
