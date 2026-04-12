import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationSession } from '../schemas/conversation-session.schema';
import { SessionStatus } from '../constants/session.constants';
import { CreateSessionDto } from '../dto/create-session.dto';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectModel(ConversationSession.name)
    private readonly sessionModel: Model<ConversationSession>,
  ) {}

  /**
   * Idempotent upsert: only inserts field values on first insert ($setOnInsert).
   * Concurrent POST /sessions with same sessionId converge on one document (unique index).
   * @param dto - The session data to upsert
   * @returns The upserted session
   */
  async upsertSession(dto: CreateSessionDto): Promise<{created: boolean, data: ConversationSession | null}> {
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    // findOneAndUpdate is used for idempotency and handle concurrent requests
    const result = await this.sessionModel.findOneAndUpdate(
      { sessionId: dto.sessionId },
      {
        $setOnInsert: {
          sessionId: dto.sessionId,
          status: SessionStatus.INITIATED,
          language: dto.language,
          startedAt,
          endedAt: null,
          metadata: dto.metadata ?? {},
        },
      },
      { upsert: true, new: true, runValidators: true, includeResultMetadata: true },
    );
    console.log(result);
    const created = !!result?.lastErrorObject?.upserted;
    console.log(created);
    const doc = result.value
    return {
      created,
      data: doc
    }
  }

  /**
   * Find a session by sessionId
   * @param sessionId - The sessionId to find
   * @returns The session
   */
  async findBySessionId(sessionId: string): Promise<ConversationSession | null> {
    const doc = await this.sessionModel.findOne({ sessionId }).lean().exec();
    return doc;
  }

  /**
   * Find a session by sessionId and complete it
   * @param sessionId - The sessionId to find
   * @returns The completed session
   */
  async findOneAndComplete(sessionId: string): Promise<ConversationSession | null> {
    const now = new Date();
    const updated = await this.sessionModel
      .findOneAndUpdate(
        { sessionId, status: { $ne: SessionStatus.COMPLETED } },
        { $set: { status: SessionStatus.COMPLETED, endedAt: now } },
        { new: true },
      )
      .lean()
      .exec();
      console.log(updated);
    if (updated) {
      return updated;
    }

    return this.findBySessionId(sessionId);
  }

  /**
   * Transition a session to active if it is initiated
   * @param sessionId - The sessionId to transition
   * @returns The transitioned session
   */
  async transitionToActiveIfInitiated(sessionId: string): Promise<ConversationSession | null> {
    const updated = await this.sessionModel.findOneAndUpdate(
      { sessionId, status: SessionStatus.INITIATED },
      { $set: { status: SessionStatus.ACTIVE } },
      { new: true }
    )
    .lean()
    .exec();
    if (updated) {
      return updated;
    }

    return this.findBySessionId(sessionId);
  }
}
