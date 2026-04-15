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
   */
  async upsertSession(dto: CreateSessionDto): Promise<ConversationSession> {
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();

    const doc = await this.sessionModel.findOneAndUpdate(
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
      { upsert: true, new: true, runValidators: true },
    );

    return doc!.toObject();
  }

  async findBySessionId(sessionId: string): Promise<ConversationSession | null> {
    const doc = await this.sessionModel.findOne({ sessionId }).lean().exec();
    return doc;
  }

  /**
   * First caller wins on endedAt; if already completed, returns existing document (read path).
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

    if (updated) {
      return updated;
    }

    return this.findBySessionId(sessionId);
  }

  async transitionToActiveIfInitiated(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { sessionId, status: SessionStatus.INITIATED },
      { $set: { status: SessionStatus.ACTIVE } },
    );
  }
}
