import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { ShiftsService } from './shifts.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { CreateShiftTemplateDto } from './dto/create-shift-template.dto.js';
import { AssignShiftDto } from './dto/assign-shift.dto.js';
import { QueryAttendanceDto } from './dto/query-attendance.dto.js';
import { CalendarQueryDto } from './dto/calendar-query.dto.js';
import {
  RequestCorrectionDto,
  ReviewCorrectionDto,
} from './dto/correction.dto.js';

@Controller('attendance')
@RequireOrganization()
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly shifts: ShiftsService,
  ) {}

  @Get('me/today')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  meToday(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.getTodayForUser(user);
  }

  @Post('me/clock-in')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  clockIn(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.clockIn(user);
  }

  @Post('me/clock-out')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  clockOut(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.clockOut(user);
  }

  @Post('me/break/start')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  startBreak(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.startBreak(user);
  }

  @Post('me/break/end')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  endBreak(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.endBreak(user);
  }

  @Get('records')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  records(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAttendanceDto,
  ) {
    return this.attendance.listRecords(user, query);
  }

  @Get('calendar')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  calendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalendarQueryDto,
  ) {
    return this.attendance.calendar(user, query);
  }

  @Get('manager/overview')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  managerOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.managerOverview(user);
  }

  @Get('reports/:type')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: 'summary' | 'late' | 'overtime' | 'absence',
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.attendance.reports(user, type, from, to);
  }

  @Post('records/:recordId/corrections')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  requestCorrection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId') recordId: string,
    @Body() dto: RequestCorrectionDto,
  ) {
    return this.attendance.requestCorrection(user, recordId, dto);
  }

  @Post('corrections/:correctionId/review')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  reviewCorrection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('correctionId') correctionId: string,
    @Body() dto: ReviewCorrectionDto,
  ) {
    return this.attendance.reviewCorrection(user, correctionId, dto.approve);
  }

  @Get('shifts/templates')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  listShiftTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.shifts.listTemplates(user.organizationId!);
  }

  @Post('shifts/templates')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  createShiftTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShiftTemplateDto,
  ) {
    return this.shifts.createTemplate(user.organizationId!, dto);
  }

  @Get('shifts/assignments')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  listAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.shifts.listAssignments(user.organizationId!, employeeId);
  }

  @Post('shifts/assignments')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  assignShift(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignShiftDto,
  ) {
    return this.shifts.assignShift(user.organizationId!, {
      employeeId: dto.employeeId,
      shiftTemplateId: dto.shiftTemplateId,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
    });
  }
}
