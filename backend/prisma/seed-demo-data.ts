import {
  AttendanceCorrectionStatus,
  AttendanceStatus,
  CandidatePipelineStage,
  EnrollmentStatus,
  GoalStatus,
  InvoiceStatus,
  LeaveRequestStatus,
  PerformanceCycleStatus,
  PerformanceReviewStatus,
  PrismaClient,
  RecommendationActionStatus,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
  RecruitmentJobStatus,
  SalaryCalculationMethod,
  SalaryComponentCategory,
  SalaryComponentType,
  SkillProficiency,
  EmployeeSkillSource,
  UsageMetricCode,
  WorkforceRiskCategory,
  WorkforceRiskSeverity,
  PayrollPeriodStatus,
} from '@prisma/client';
import { DEMO_CREDENTIALS } from './seed-demo.js';

const FIXTURE_MARKER_JOB_TITLE = 'Senior Backend Engineer (Demo)';

function utcDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(base: Date, days: number) {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return utcDate(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
}

type DemoPerson = {
  num: string;
  firstName: string;
  lastName: string;
  email: string;
  deptCode: 'ENG' | 'HR' | 'SALES';
  jobTitle: string;
  managerNum?: string;
};

const DEMO_PEOPLE: DemoPerson[] = [
  {
    num: '002',
    firstName: 'Alex',
    lastName: 'Chen',
    email: 'alex.chen@demo-workforce.local',
    deptCode: 'ENG',
    jobTitle: 'Engineering Manager',
  },
  {
    num: '003',
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@demo-workforce.local',
    deptCode: 'ENG',
    jobTitle: 'Senior Software Engineer',
    managerNum: '002',
  },
  {
    num: '004',
    firstName: 'Sam',
    lastName: 'Patel',
    email: 'sam.patel@demo-workforce.local',
    deptCode: 'ENG',
    jobTitle: 'Software Engineer',
    managerNum: '002',
  },
  {
    num: '005',
    firstName: 'Riley',
    lastName: 'Nguyen',
    email: 'riley.nguyen@demo-workforce.local',
    deptCode: 'ENG',
    jobTitle: 'Software Engineer',
    managerNum: '002',
  },
  {
    num: '006',
    firstName: 'Morgan',
    lastName: 'Taylor',
    email: 'morgan.taylor@demo-workforce.local',
    deptCode: 'HR',
    jobTitle: 'HR Manager',
  },
  {
    num: '007',
    firstName: 'Casey',
    lastName: 'Brown',
    email: 'casey.brown@demo-workforce.local',
    deptCode: 'HR',
    jobTitle: 'HR Generalist',
    managerNum: '006',
  },
  {
    num: '008',
    firstName: 'Drew',
    lastName: 'Martinez',
    email: 'drew.martinez@demo-workforce.local',
    deptCode: 'SALES',
    jobTitle: 'Sales Director',
  },
  {
    num: '009',
    firstName: 'Jamie',
    lastName: 'Wilson',
    email: 'jamie.wilson@demo-workforce.local',
    deptCode: 'SALES',
    jobTitle: 'Account Executive',
    managerNum: '008',
  },
  {
    num: '010',
    firstName: 'Avery',
    lastName: 'Kim',
    email: 'avery.kim@demo-workforce.local',
    deptCode: 'SALES',
    jobTitle: 'Account Executive',
    managerNum: '008',
  },
  {
    num: '011',
    firstName: 'Quinn',
    lastName: 'Davis',
    email: 'quinn.davis@demo-workforce.local',
    deptCode: 'ENG',
    jobTitle: 'QA Engineer',
    managerNum: '002',
  },
  {
    num: '012',
    firstName: 'Skyler',
    lastName: 'Moore',
    email: 'skyler.moore@demo-workforce.local',
    deptCode: 'ENG',
    jobTitle: 'DevOps Engineer',
    managerNum: '002',
  },
];

export async function seedDemoFixtures(prisma: PrismaClient) {
  if (process.env.SEED_DEMO === 'false') {
    return;
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: DEMO_CREDENTIALS.organizationSlug },
  });
  if (!organization) {
    console.warn('[seed-demo-data] demo org missing — run seedDemoUser first');
    return;
  }

  const existingMarker = await prisma.recruitmentJob.findFirst({
    where: { organizationId: organization.id, title: FIXTURE_MARKER_JOB_TITLE },
  });
  if (existingMarker) {
    console.log('[seed-demo-data] fixtures already loaded — skipping');
    return;
  }

  const ownerEmployee = await prisma.employee.findFirst({
    where: {
      organizationId: organization.id,
      email: DEMO_CREDENTIALS.email.toLowerCase(),
    },
  });
  if (!ownerEmployee) {
    console.warn('[seed-demo-data] owner employee missing');
    return;
  }

  const ownerUser = await prisma.user.findUnique({
    where: { email: DEMO_CREDENTIALS.email.toLowerCase() },
  });

  const deptEng = await prisma.department.upsert({
    where: {
      organizationId_code: { organizationId: organization.id, code: 'ENG' },
    },
    update: { name: 'Engineering' },
    create: {
      organizationId: organization.id,
      code: 'ENG',
      name: 'Engineering',
      description: 'Product engineering',
      managerEmployeeId: ownerEmployee.id,
    },
  });

  const deptHr = await prisma.department.upsert({
    where: {
      organizationId_code: { organizationId: organization.id, code: 'HR' },
    },
    update: { name: 'People Operations' },
    create: {
      organizationId: organization.id,
      code: 'HR',
      name: 'People Operations',
      description: 'HR and people ops',
    },
  });

  const deptSales = await prisma.department.upsert({
    where: {
      organizationId_code: { organizationId: organization.id, code: 'SALES' },
    },
    update: { name: 'Sales' },
    create: {
      organizationId: organization.id,
      code: 'SALES',
      name: 'Sales',
      description: 'Revenue team',
    },
  });

  const deptByCode = { ENG: deptEng, HR: deptHr, SALES: deptSales };

  const jobTitleIds = new Map<string, string>();
  const titles = [
    'Engineering Manager',
    'Senior Software Engineer',
    'Software Engineer',
    'HR Manager',
    'HR Generalist',
    'Sales Director',
    'Account Executive',
    'QA Engineer',
    'DevOps Engineer',
    'Owner',
  ];
  for (const title of titles) {
    const jt = await prisma.jobTitle.upsert({
      where: {
        organizationId_title: { organizationId: organization.id, title },
      },
      update: {},
      create: { organizationId: organization.id, title },
    });
    jobTitleIds.set(title, jt.id);
  }

  const employeeByNum = new Map<string, string>();
  employeeByNum.set('001', ownerEmployee.id);

  for (const person of DEMO_PEOPLE) {
    const dept = deptByCode[person.deptCode];
    const jobTitleId = jobTitleIds.get(person.jobTitle);
    const emp = await prisma.employee.upsert({
      where: {
        organizationId_email: {
          organizationId: organization.id,
          email: person.email,
        },
      },
      update: {
        firstName: person.firstName,
        lastName: person.lastName,
        departmentId: dept.id,
        jobTitleId,
        employmentStatus: 'ACTIVE',
      },
      create: {
        organizationId: organization.id,
        employeeNumber: `EMP-DEMO-${person.num}`,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        departmentId: dept.id,
        jobTitleId,
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        joinDate: utcDate(2024, 3, 1),
        workLocation: person.deptCode === 'SALES' ? 'Remote' : 'Hybrid',
      },
    });
    employeeByNum.set(person.num, emp.id);
  }

  for (const person of DEMO_PEOPLE) {
    if (!person.managerNum) continue;
    const empId = employeeByNum.get(person.num);
    const managerId =
      person.managerNum === '001'
        ? ownerEmployee.id
        : employeeByNum.get(person.managerNum);
    if (empId && managerId) {
      await prisma.employee.update({
        where: { id: empId },
        data: { managerId },
      });
    }
  }

  await prisma.department.update({
    where: { id: deptEng.id },
    data: { managerEmployeeId: employeeByNum.get('002') ?? ownerEmployee.id },
  });
  await prisma.department.update({
    where: { id: deptHr.id },
    data: { managerEmployeeId: employeeByNum.get('006') },
  });
  await prisma.department.update({
    where: { id: deptSales.id },
    data: { managerEmployeeId: employeeByNum.get('008') },
  });

  const leaveAnnual = await prisma.leaveType.upsert({
    where: {
      organizationId_code: { organizationId: organization.id, code: 'ANNUAL' },
    },
    update: { name: 'Annual Leave', isPaid: true, isActive: true },
    create: {
      organizationId: organization.id,
      code: 'ANNUAL',
      name: 'Annual Leave',
      isPaid: true,
    },
  });

  const leaveSick = await prisma.leaveType.upsert({
    where: {
      organizationId_code: { organizationId: organization.id, code: 'SICK' },
    },
    update: { name: 'Sick Leave', isPaid: true, isActive: true },
    create: {
      organizationId: organization.id,
      code: 'SICK',
      name: 'Sick Leave',
      isPaid: true,
    },
  });

  for (const lt of [leaveAnnual, leaveSick]) {
    await prisma.leavePolicy.upsert({
      where: {
        organizationId_leaveTypeId: {
          organizationId: organization.id,
          leaveTypeId: lt.id,
        },
      },
      update: { defaultAnnualDays: lt.code === 'ANNUAL' ? 20 : 10 },
      create: {
        organizationId: organization.id,
        leaveTypeId: lt.id,
        defaultAnnualDays: lt.code === 'ANNUAL' ? 20 : 10,
        requiresApproval: true,
      },
    });
  }

  const balanceYear = 2026;
  const balanceEmployees = ['003', '004', '007', '009', '011'];
  for (const num of balanceEmployees) {
    const employeeId = employeeByNum.get(num);
    if (!employeeId) continue;
    for (const lt of [leaveAnnual, leaveSick]) {
      const allocated = lt.code === 'ANNUAL' ? 20 : 10;
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId: lt.id,
            year: balanceYear,
          },
        },
        update: { allocated, used: lt.code === 'ANNUAL' ? 3 : 1, pending: 2 },
        create: {
          organizationId: organization.id,
          employeeId,
          leaveTypeId: lt.id,
          year: balanceYear,
          allocated,
          used: lt.code === 'ANNUAL' ? 3 : 1,
          pending: 2,
        },
      });
    }
  }

  await prisma.leaveRequest.create({
    data: {
      organizationId: organization.id,
      employeeId: employeeByNum.get('003')!,
      leaveTypeId: leaveAnnual.id,
      startDate: utcDate(2026, 10, 6),
      endDate: utcDate(2026, 10, 8),
      totalDays: 3,
      reason: '[demo-seed] Family trip',
      status: LeaveRequestStatus.PENDING,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      organizationId: organization.id,
      employeeId: employeeByNum.get('009')!,
      leaveTypeId: leaveSick.id,
      startDate: utcDate(2026, 9, 29),
      endDate: utcDate(2026, 9, 29),
      totalDays: 1,
      reason: '[demo-seed] Medical appointment',
      status: LeaveRequestStatus.PENDING,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      organizationId: organization.id,
      employeeId: employeeByNum.get('004')!,
      leaveTypeId: leaveAnnual.id,
      startDate: utcDate(2026, 8, 11),
      endDate: utcDate(2026, 8, 15),
      totalDays: 5,
      reason: '[demo-seed] Summer vacation',
      status: LeaveRequestStatus.APPROVED,
      approverUserId: ownerUser?.id,
      decidedAt: utcDate(2026, 7, 20),
      decisionNote: 'Approved — coverage arranged',
    },
  });

  const shift = await prisma.shiftTemplate.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Standard 9-5 (Demo)',
      },
    },
    update: { isActive: true },
    create: {
      organizationId: organization.id,
      name: 'Standard 9-5 (Demo)',
      startTime: '09:00',
      endTime: '17:00',
      breakDurationMinutes: 60,
      workingDays: [1, 2, 3, 4, 5],
      gracePeriodMinutes: 10,
      overtimeThresholdMinutes: 480,
    },
  });

  const shiftEmployees = ['003', '004', '005', '011', '012'];
  const effectiveFrom = utcDate(2026, 1, 1);
  for (const num of shiftEmployees) {
    const employeeId = employeeByNum.get(num);
    if (!employeeId) continue;
    const existing = await prisma.employeeShiftAssignment.findFirst({
      where: { organizationId: organization.id, employeeId, shiftTemplateId: shift.id },
    });
    if (!existing) {
      await prisma.employeeShiftAssignment.create({
        data: {
          organizationId: organization.id,
          employeeId,
          shiftTemplateId: shift.id,
          effectiveFrom,
        },
      });
    }
  }

  const today = utcDate(2026, 9, 28);
  for (let i = 0; i < 7; i++) {
    const workDate = addDays(today, -i);
    const dow = workDate.getUTCDay();
    if (dow === 0 || dow === 6) continue;

    for (const num of shiftEmployees) {
      const employeeId = employeeByNum.get(num)!;
      const isLate = i === 1 && num === '004';
      const isAbsent = i === 2 && num === '005';
      const status = isAbsent
        ? AttendanceStatus.ABSENT
        : isLate
          ? AttendanceStatus.LATE
          : AttendanceStatus.PRESENT;

      const clockIn = new Date(workDate);
      clockIn.setUTCHours(isLate ? 9 : 8, isLate ? 25 : 55, 0, 0);
      const clockOut = new Date(workDate);
      clockOut.setUTCHours(17, 5, 0, 0);

      await prisma.attendanceRecord.upsert({
        where: {
          organizationId_employeeId_workDate: {
            organizationId: organization.id,
            employeeId,
            workDate,
          },
        },
        update: { status, shiftTemplateId: shift.id },
        create: {
          organizationId: organization.id,
          employeeId,
          workDate,
          shiftTemplateId: shift.id,
          status,
          clockInAt: isAbsent ? undefined : clockIn,
          clockOutAt: isAbsent ? undefined : clockOut,
          workedMinutes: isAbsent ? 0 : 480,
          lateMinutes: isLate ? 25 : 0,
          missingClockOut: false,
        },
      });
    }
  }

  const absentRecord = await prisma.attendanceRecord.findUnique({
    where: {
      organizationId_employeeId_workDate: {
        organizationId: organization.id,
        employeeId: employeeByNum.get('005')!,
        workDate: addDays(today, -2),
      },
    },
  });
  if (absentRecord && ownerUser) {
    await prisma.attendanceCorrection.create({
      data: {
        organizationId: organization.id,
        attendanceRecordId: absentRecord.id,
        requestedByUserId: ownerUser.id,
        proposedClockInAt: new Date(addDays(today, -2).setUTCHours(9, 0, 0, 0)),
        proposedClockOutAt: new Date(addDays(today, -2).setUTCHours(17, 0, 0, 0)),
        reason: '[demo-seed] Forgot to clock in — was on site',
        status: AttendanceCorrectionStatus.PENDING,
      },
    });
  }

  const salaryStructure = await prisma.salaryStructure.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'US Standard (Demo)',
      },
    },
    update: { isDefault: true, isActive: true },
    create: {
      organizationId: organization.id,
      name: 'US Standard (Demo)',
      currency: 'USD',
      isDefault: true,
      isActive: true,
    },
  });

  await prisma.salaryComponent.upsert({
    where: {
      salaryStructureId_code: {
        salaryStructureId: salaryStructure.id,
        code: 'BASE',
      },
    },
    update: { isActive: true },
    create: {
      organizationId: organization.id,
      salaryStructureId: salaryStructure.id,
      code: 'BASE',
      name: 'Base Salary',
      componentType: SalaryComponentType.EARNING,
      category: SalaryComponentCategory.BASIC,
      calculationMethod: SalaryCalculationMethod.FIXED,
      fixedAmount: 0,
      isTaxable: true,
      effectiveFrom: utcDate(2026, 1, 1),
    },
  });

  const salaryMap: Record<string, number> = {
    '001': 185000,
    '002': 165000,
    '003': 142000,
    '004': 118000,
    '005': 115000,
    '006': 130000,
    '007': 85000,
    '008': 155000,
    '009': 95000,
    '010': 92000,
    '011': 105000,
    '012': 128000,
  };

  for (const [num, baseAmount] of Object.entries(salaryMap)) {
    const employeeId = employeeByNum.get(num);
    if (!employeeId) continue;
    const existing = await prisma.employeeSalary.findFirst({
      where: {
        organizationId: organization.id,
        employeeId,
        salaryStructureId: salaryStructure.id,
        effectiveTo: null,
      },
    });
    if (!existing) {
      await prisma.employeeSalary.create({
        data: {
          organizationId: organization.id,
          employeeId,
          salaryStructureId: salaryStructure.id,
          baseAmount,
          currency: 'USD',
          effectiveFrom: utcDate(2026, 1, 1),
        },
      });
    }
  }

  const periodStart = utcDate(2026, 9, 1);
  const periodEnd = utcDate(2026, 9, 30);
  const payrollPeriod = await prisma.payrollPeriod.upsert({
    where: {
      organizationId_startDate_endDate: {
        organizationId: organization.id,
        startDate: periodStart,
        endDate: periodEnd,
      },
    },
    update: { name: 'September 2026', status: PayrollPeriodStatus.REVIEW },
    create: {
      organizationId: organization.id,
      name: 'September 2026',
      startDate: periodStart,
      endDate: periodEnd,
      status: PayrollPeriodStatus.REVIEW,
    },
  });

  let payrollRun = await prisma.payrollRun.findFirst({
    where: { organizationId: organization.id, payrollPeriodId: payrollPeriod.id },
  });
  if (!payrollRun) {
    payrollRun = await prisma.payrollRun.create({
      data: {
        organizationId: organization.id,
        payrollPeriodId: payrollPeriod.id,
        calculatedAt: new Date(),
        calculatedByUserId: ownerUser?.id,
      },
    });
  }

  for (const num of ['003', '004', '006']) {
    const employeeId = employeeByNum.get(num)!;
    const base = salaryMap[num] ?? 100000;
    const gross = Math.round(base / 12);
    const deductions = Math.round(gross * 0.22);
    const net = gross - deductions;
    await prisma.payrollItem.upsert({
      where: {
        payrollRunId_employeeId: {
          payrollRunId: payrollRun.id,
          employeeId,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        payrollRunId: payrollRun.id,
        employeeId,
        grossAmount: gross,
        totalDeductions: deductions,
        netAmount: net,
        taxableAmount: gross,
        breakdown: {
          components: [{ code: 'BASE', amount: gross, type: 'EARNING' }],
          deductions: [{ code: 'TAX_EST', amount: deductions }],
        },
      },
    });
  }

  const jobBackend = await prisma.recruitmentJob.create({
    data: {
      organizationId: organization.id,
      departmentId: deptEng.id,
      title: FIXTURE_MARKER_JOB_TITLE,
      description: 'Build scalable APIs and mentor engineers.',
      requirements: '5+ years backend, TypeScript, PostgreSQL',
      employmentType: 'FULL_TIME',
      location: 'New York / Remote',
      salaryMin: 130000,
      salaryMax: 170000,
      status: RecruitmentJobStatus.OPEN,
      publishedAt: utcDate(2026, 9, 1),
    },
  });

  await prisma.recruitmentJob.create({
    data: {
      organizationId: organization.id,
      departmentId: deptSales.id,
      title: 'Enterprise Account Executive (Demo)',
      description: 'Own mid-market SaaS deals end-to-end.',
      status: RecruitmentJobStatus.OPEN,
      publishedAt: utcDate(2026, 8, 15),
      salaryMin: 90000,
      salaryMax: 140000,
      employmentType: 'FULL_TIME',
      location: 'Remote US',
    },
  });

  const candidates = [
    { first: 'Taylor', last: 'Brooks', email: 'taylor.brooks.candidate@example.com', stage: CandidatePipelineStage.SCREENING },
    { first: 'Chris', last: 'Evans', email: 'chris.evans.candidate@example.com', stage: CandidatePipelineStage.INTERVIEW },
    { first: 'Priya', last: 'Sharma', email: 'priya.sharma.candidate@example.com', stage: CandidatePipelineStage.SHORTLISTED },
    { first: 'Marcus', last: 'Johnson', email: 'marcus.johnson.candidate@example.com', stage: CandidatePipelineStage.APPLIED },
    { first: 'Elena', last: 'Ruiz', email: 'elena.ruiz.candidate@example.com', stage: CandidatePipelineStage.OFFER },
  ];

  for (const c of candidates) {
    const candidate = await prisma.candidate.upsert({
      where: {
        organizationId_email: {
          organizationId: organization.id,
          email: c.email,
        },
      },
      update: { firstName: c.first, lastName: c.last },
      create: {
        organizationId: organization.id,
        firstName: c.first,
        lastName: c.last,
        email: c.email,
        source: 'demo-seed',
      },
    });

    await prisma.jobApplication.upsert({
      where: {
        jobId_candidateId: { jobId: jobBackend.id, candidateId: candidate.id },
      },
      update: { stage: c.stage },
      create: {
        organizationId: organization.id,
        jobId: jobBackend.id,
        candidateId: candidate.id,
        stage: c.stage,
      },
    });
  }

  const course = await prisma.course.create({
    data: {
      organizationId: organization.id,
      title: 'Workplace Safety Essentials (Demo)',
      description: 'Mandatory safety training for all staff.',
      isPublished: true,
      modules: {
        create: [
          {
            title: 'Introduction',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Why safety matters',
                  contentType: 'TEXT',
                  content: 'Overview of workplace safety policies.',
                  sortOrder: 0,
                },
              ],
            },
          },
        ],
      },
    },
  });

  for (const num of ['003', '004', '007', '011']) {
    const employeeId = employeeByNum.get(num)!;
    await prisma.employeeEnrollment.upsert({
      where: { employeeId_courseId: { employeeId, courseId: course.id } },
      update: {},
      create: {
        organizationId: organization.id,
        employeeId,
        courseId: course.id,
        status:
          num === '003' ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS,
        progressPercent: num === '003' ? 100 : num === '004' ? 45 : 10,
        startedAt: utcDate(2026, 9, 1),
        completedAt: num === '003' ? utcDate(2026, 9, 10) : undefined,
      },
    });
  }

  const perfCycle = await prisma.performanceCycle.create({
    data: {
      organizationId: organization.id,
      name: '2026 H1 Review (Demo)',
      startDate: utcDate(2026, 1, 1),
      endDate: utcDate(2026, 6, 30),
      status: PerformanceCycleStatus.ACTIVE,
      kpis: {
        create: [
          {
            organizationId: organization.id,
            name: 'Delivery velocity',
            targetValue: 85,
            unit: '%',
          },
        ],
      },
    },
  });

  for (const [num, title, progress] of [
    ['003', 'Ship payroll integration', 70],
    ['004', 'Reduce API latency P95', 55],
    ['009', 'Close $500k pipeline', 40],
  ] as const) {
    await prisma.goal.create({
      data: {
        organizationId: organization.id,
        cycleId: perfCycle.id,
        employeeId: employeeByNum.get(num)!,
        title,
        status: GoalStatus.ACTIVE,
        progressPercent: progress,
        dueDate: utcDate(2026, 6, 15),
      },
    });
  }

  await prisma.performanceReview.create({
    data: {
      organizationId: organization.id,
      cycleId: perfCycle.id,
      employeeId: employeeByNum.get('004')!,
      managerId: employeeByNum.get('002'),
      status: PerformanceReviewStatus.MANAGER_REVIEW,
      managerSummary: '[demo-seed] Strong contributor; ready for senior track.',
    },
  });

  const skillCategory = await prisma.skillCategory.upsert({
    where: {
      organizationId_name: { organizationId: organization.id, name: 'Engineering (Demo)' },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Engineering (Demo)',
      description: 'Technical skills',
    },
  });

  const skillNames = ['TypeScript', 'PostgreSQL', 'System Design'];
  const skillIds: string[] = [];
  for (const name of skillNames) {
    const skill = await prisma.skill.upsert({
      where: { organizationId_name: { organizationId: organization.id, name } },
      update: { categoryId: skillCategory.id },
      create: {
        organizationId: organization.id,
        categoryId: skillCategory.id,
        name,
      },
    });
    skillIds.push(skill.id);
  }

  await prisma.employeeSkill.upsert({
    where: {
      employeeId_skillId: {
        employeeId: employeeByNum.get('003')!,
        skillId: skillIds[0]!,
      },
    },
    update: { proficiency: SkillProficiency.ADVANCED },
    create: {
      employeeId: employeeByNum.get('003')!,
      skillId: skillIds[0]!,
      proficiency: SkillProficiency.ADVANCED,
      source: EmployeeSkillSource.HR,
    },
  });

  await prisma.skillGap.create({
    data: {
      organizationId: organization.id,
      employeeId: employeeByNum.get('005')!,
      skillId: skillIds[2]!,
      profileName: 'Software Engineer',
      requiredProficiency: SkillProficiency.ADVANCED,
      actualProficiency: SkillProficiency.BEGINNER,
      gapLevels: 2,
    },
  });

  await prisma.workforceRisk.createMany({
    data: [
      {
        organizationId: organization.id,
        category: WorkforceRiskCategory.ATTENDANCE,
        severity: WorkforceRiskSeverity.HIGH,
        title: 'Repeated lateness — Engineering',
        summary: '3 employees logged late arrivals in the last 7 days.',
        ruleCode: 'DEMO_ATTENDANCE_PATTERN',
        evidence: { lateCount: 3, windowDays: 7 },
        departmentId: deptEng.id,
      },
      {
        organizationId: organization.id,
        category: WorkforceRiskCategory.SKILLS,
        severity: WorkforceRiskSeverity.CRITICAL,
        title: 'System design gap on backend bench',
        summary: 'Bench strength below target for upcoming platform work.',
        ruleCode: 'DEMO_SKILL_GAP',
        evidence: { gapCount: 4 },
        employeeId: employeeByNum.get('005'),
      },
      {
        organizationId: organization.id,
        category: WorkforceRiskCategory.TRAINING,
        severity: WorkforceRiskSeverity.MEDIUM,
        title: 'Safety training incomplete',
        summary: 'Several enrollments still in progress past due date.',
        ruleCode: 'DEMO_TRAINING_OVERDUE',
        evidence: { overdueEnrollments: 2 },
        departmentId: deptHr.id,
      },
    ],
  });

  await prisma.workforceInsight.createMany({
    data: [
      {
        organizationId: organization.id,
        insightType: 'HEADCOUNT',
        title: 'Engineering grew 12% YoY',
        whatHappened: 'Headcount in Engineering increased from 18 to 20 FTEs.',
        whyItMatters: 'Plan hiring budget and manager span of control.',
        recommendedAction: 'Review eng manager ratios in Q4 planning.',
        departmentId: deptEng.id,
        metrics: { growthPercent: 12 },
      },
      {
        organizationId: organization.id,
        insightType: 'LEAVE',
        title: 'Pending leave approvals',
        whatHappened: '2 leave requests await approver action.',
        whyItMatters: 'Delays affect team scheduling and employee experience.',
        recommendedAction: 'Approve or reject pending requests this week.',
      },
      {
        organizationId: organization.id,
        insightType: 'RECRUITMENT',
        title: 'Strong pipeline for backend role',
        whatHappened: '5 active candidates across interview stages.',
        whyItMatters: 'Time-to-fill may improve if interviews stay on schedule.',
        recommendedAction: 'Confirm interview panel availability.',
        departmentId: deptEng.id,
      },
    ],
  });

  const rec1 = await prisma.recommendation.upsert({
    where: {
      organizationId_ruleCode_dedupeKey: {
        organizationId: organization.id,
        ruleCode: 'DEMO_LEAVE_BACKLOG',
        dedupeKey: 'pending-leave-2026-09',
      },
    },
    update: { status: RecommendationStatus.OPEN },
    create: {
      organizationId: organization.id,
      ruleCode: 'DEMO_LEAVE_BACKLOG',
      type: RecommendationType.WORKFORCE,
      status: RecommendationStatus.OPEN,
      priority: RecommendationPriority.HIGH,
      title: 'Clear pending leave requests',
      whatHappened: 'Multiple employees have leave waiting for approval.',
      evidence: { pendingCount: 2 },
      whyItMatters: 'Backlog creates scheduling uncertainty.',
      recommendedAction: 'Review and action pending leave in Leave module.',
      dedupeKey: 'pending-leave-2026-09',
      departmentId: deptHr.id,
      confidenceScore: 0.92,
    },
  });

  await prisma.recommendationAction.create({
    data: {
      organizationId: organization.id,
      recommendationId: rec1.id,
      status: RecommendationActionStatus.PENDING,
      title: 'Approve or reject 2 pending requests',
      description: 'Demo action tied to seeded leave backlog.',
      source: 'demo-seed',
      priority: RecommendationPriority.HIGH,
      recommendedAction: 'Open Leave → Approvals queue',
    },
  });

  await prisma.recommendation.upsert({
    where: {
      organizationId_ruleCode_dedupeKey: {
        organizationId: organization.id,
        ruleCode: 'DEMO_ATTENDANCE_CORRECTION',
        dedupeKey: 'attendance-correction-001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      ruleCode: 'DEMO_ATTENDANCE_CORRECTION',
      type: RecommendationType.ATTENDANCE,
      status: RecommendationStatus.OPEN,
      priority: RecommendationPriority.URGENT,
      title: 'Attendance correction awaiting review',
      whatHappened: 'An employee submitted a clock-in correction.',
      evidence: { correctionStatus: 'PENDING' },
      whyItMatters: 'Payroll accuracy depends on resolved attendance.',
      recommendedAction: 'Review correction in Attendance module.',
      dedupeKey: 'attendance-correction-001',
      departmentId: deptEng.id,
      confidenceScore: 0.88,
    },
  });

  const subscription = await prisma.subscription.findFirst({
    where: { organizationId: organization.id },
  });

  await prisma.invoice.create({
    data: {
      organizationId: organization.id,
      subscriptionId: subscription?.id,
      status: InvoiceStatus.OPEN,
      amountCents: 0,
      currency: 'USD',
      externalInvoiceId: 'demo-inv-sept-2026',
      issuedAt: utcDate(2026, 9, 1),
      lineItems: [{ description: 'Free plan', amountCents: 0 }],
    },
  });

  await prisma.usageRecord.createMany({
    data: [
      {
        organizationId: organization.id,
        metric: UsageMetricCode.ACTIVE_EMPLOYEES,
        quantity: 13,
        periodStart: periodStart,
        periodEnd: periodEnd,
      },
      {
        organizationId: organization.id,
        metric: UsageMetricCode.RECRUITMENT_CANDIDATES,
        quantity: 5,
      },
      {
        organizationId: organization.id,
        metric: UsageMetricCode.AI_REQUESTS,
        quantity: 42,
        metadata: { source: 'demo-seed' },
      },
    ],
  });

  if (ownerUser) {
    await prisma.auditLog.createMany({
      data: [
        {
          organizationId: organization.id,
          actorUserId: ownerUser.id,
          action: 'auth.login',
          resourceType: 'session',
          ipAddress: '127.0.0.1',
          userAgent: 'demo-seed',
          metadata: { demo: true },
        },
        {
          organizationId: organization.id,
          actorUserId: ownerUser.id,
          action: 'leave.approve',
          resourceType: 'leave_request',
          metadata: { demo: true, note: 'Sample audit entry' },
        },
        {
          organizationId: organization.id,
          actorUserId: ownerUser.id,
          action: 'billing.view',
          resourceType: 'subscription',
          metadata: { demo: true },
        },
      ],
    });
  }

  console.log('[seed-demo-data] loaded demo fixtures for', DEMO_CREDENTIALS.organizationSlug);
  console.log('  • ~13 employees, 3 departments, leave/attendance/payroll samples');
  console.log('  • 2 open jobs, 5 candidates, training + performance data');
  console.log('  • risks, insights, recommendations, billing usage + audit samples');
}
