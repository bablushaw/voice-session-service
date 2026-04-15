import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionRepository } from './repositories/session.repository';
import { EventRepository } from './repositories/event.repository';
import { CreateSessionDto } from './dto/create-session.dto';
import { AddEventDto } from './dto/add-event.dto';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { SessionStatus } from './constants/session.constants';
import { ConversationSession } from './schemas/conversation-session.schema';
import { ConversationEvent } from './schemas/conversation-event.schema';

export interface SessionWithEventsResponse {
  session: ConversationSession;
  events: ConversationEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly eventRepository: EventRepository,
  ) {}

  async createOrGetSession(dto: CreateSessionDto): Promise<ConversationSession> {
    return this.sessionRepository.upsertSession(dto);
  }

  async addEvent(sessionId: string, dto: AddEventDto): Promise<ConversationEvent> {
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (
      session.status === SessionStatus.COMPLETED ||
      session.status === SessionStatus.FAILED
    ) {
      throw new BadRequestException(
        `Cannot add events to session in status ${session.status}`,
      );
    }

    const timestamp = dto.timestamp ? new Date(dto.timestamp) : new Date();

    const { event } = await this.eventRepository.insertEvent({
      sessionId,
      eventId: dto.eventId,
      type: dto.type,
      payload: dto.payload,
      timestamp,
    });

    await this.sessionRepository.transitionToActiveIfInitiated(sessionId);

    return event;
  }

  async getSessionWithEvents(
    sessionId: string,
    query: ListEventsQueryDto,
  ): Promise<SessionWithEventsResponse> {
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [total, events] = await Promise.all([
      this.eventRepository.countBySessionId(sessionId),
      this.eventRepository.findBySessionOrdered(sessionId, skip, limit),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      session,
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async completeSession(sessionId: string): Promise<ConversationSession> {
    const existing = await this.sessionRepository.findBySessionId(sessionId);
    if (!existing) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (existing.status === SessionStatus.COMPLETED) {
      return existing;
    }

    if (existing.status === SessionStatus.FAILED) {
      throw new BadRequestException(
        'Cannot complete a session that has already failed',
      );
    }

    const updated = await this.sessionRepository.findOneAndComplete(sessionId);
    if (!updated) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return updated;
  }
}
