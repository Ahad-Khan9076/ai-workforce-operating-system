import { PrismaClient } from '@prisma/client';
import {
  ALL_PERMISSIONS,
  ROLE_CODES,
  ROLE_PERMISSION_MAP,
} from '../src/common/constants/permissions.js';

const ROLE_NAMES: Record<string, string> = {
  OWNER: 'Owner',
  HR_ADMIN: 'HR Admin',
  HR_MANAGER: 'HR Manager',
  DEPARTMENT_MANAGER: 'Department Manager',
  EMPLOYEE: 'Employee',
  RECRUITER: 'Recruiter',
  PAYROLL_ADMIN: 'Payroll Admin',
  TRAINING_MANAGER: 'Training Manager',
};

const prisma = new PrismaClient();

async function main() {
  for (const code of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: { description: code.replace(/\./g, ' ') },
      create: {
        code,
        description: code.replace(/\./g, ' '),
      },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionByCode = new Map(permissions.map((p) => [p.code, p.id]));

  for (const code of Object.values(ROLE_CODES)) {
    await prisma.role.upsert({
      where: { code },
      update: {
        name: ROLE_NAMES[code] ?? code,
        description: `${ROLE_NAMES[code] ?? code} system role`,
      },
      create: {
        code,
        name: ROLE_NAMES[code] ?? code,
        description: `${ROLE_NAMES[code] ?? code} system role`,
        isSystem: true,
      },
    });
  }

  const roles = await prisma.role.findMany();
  const roleByCode = new Map(roles.map((r) => [r.code, r.id]));

  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleByCode.get(roleCode);
    if (!roleId) continue;

    for (const permissionCode of permissionCodes) {
      const permissionId = permissionByCode.get(permissionCode);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
