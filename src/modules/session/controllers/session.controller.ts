import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionService } from '../session.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { AddEventDto } from '../dto/add-event.dto';
import { ListEventsQueryDto } from '../dto/list-events-query.dto';

@ApiTags('sessions')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiOperation({
    summary: 'Create or upsert session',
    description:
      'Idempotent: creates a session if `sessionId` is new; returns the existing session if it already exists (no overwrite). Safe under concurrent requests.',
  })
  @ApiBody({ type: CreateSessionDto })
  @ApiResponse({ status: 201, description: 'Session created or returned (upsert).' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.sessionService.createOrGetSession(dto);
  }

  @Post(':sessionId/complete')
  @ApiOperation({
    summary: 'Complete session',
    description:
      'Sets status to `completed` and `endedAt`. Idempotent if already completed.',
  })
  @ApiParam({ name: 'sessionId', description: 'External session identifier', example: 'call-abc-123' })
  @ApiResponse({ status: 200, description: 'Session completed or already completed.' })
  @ApiResponse({ status: 400, description: 'Cannot complete (e.g. failed session).' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  completeSession(@Param('sessionId') sessionId: string) {
    return this.sessionService.completeSession(sessionId);
  }

  @Post(':sessionId/events')
  @ApiOperation({
    summary: 'Add event to session',
    description:
      'Appends an immutable event. Duplicate `eventId` for the same session returns the existing event (idempotent).',
  })
  @ApiParam({ name: 'sessionId', description: 'Session id', example: 'call-abc-123' })
  @ApiBody({ type: AddEventDto })
  @ApiResponse({ status: 201, description: 'Event created or existing event returned.' })
  @ApiResponse({ status: 400, description: 'Session closed or validation error.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  addEvent(@Param('sessionId') sessionId: string, @Body() dto: AddEventDto) {
    return this.sessionService.addEvent(sessionId, dto);
  }

  @Get(':sessionId')
  @ApiOperation({
    summary: 'Get session with events',
    description: 'Returns session document and events ordered by `timestamp`, with pagination.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session id', example: 'call-abc-123' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Session and paginated events.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  getSession(
    @Param('sessionId') sessionId: string,
    @Query() query: ListEventsQueryDto,
  ) {
    return this.sessionService.getSessionWithEvents(sessionId, query);
  }
}
