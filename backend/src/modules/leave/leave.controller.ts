import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { LeaveService } from './leave.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireOrganization } from '../../common/decorators/require-organization.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto.js';
import { LeaveDecisionDto } from './dto/decision.dto.js';

@Controller('leave')
@RequireOrganization()
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get('types')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  types(@CurrentUser() user: AuthenticatedUser) {
    return this.leave.listTypes(user.organizationId!);
  }

  @Get('balances')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  balances(
    @CurrentUser() user: AuthenticatedUser,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.leave.getBalances(user, employeeId);
  }

  @Get('requests')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  requests(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: LeaveRequestStatus,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.leave.listRequests(user, { status, employeeId });
  }

  @Post('requests')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leave.createRequest(user, dto);
  }

  @Post('requests/:requestId/approve')
  @RequirePermissions(PERMISSIONS.LEAVE_APPROVE)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
    @Body() dto: LeaveDecisionDto,
  ) {
    return this.leave.approveRequest(user, requestId, dto.note);
  }

  @Post('requests/:requestId/reject')
  @RequirePermissions(PERMISSIONS.LEAVE_APPROVE)
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
    @Body() dto: LeaveDecisionDto,
  ) {
    return this.leave.rejectRequest(user, requestId, dto.note);
  }

  @Post('requests/:requestId/cancel')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ) {
    return this.leave.cancelRequest(user, requestId);
  }

  @Get('reports')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.leave.leaveReport(user, from, to);
  }
}
