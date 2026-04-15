import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationEvent } from '../schemas/conversation-event.schema';
import { ConversationEventType } from '../constants/session.constants';

export interface CreateEventInput {
  sessionId: string;
  eventId: string;
  type: ConversationEventType;
  payload: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class EventRepository {
  constructor(
    @InjectModel(ConversationEvent.name)
    private readonly eventModel: Model<ConversationEvent>,
  ) {}

  async insertEvent(input: CreateEventInput): Promise<{ created: boolean; event: ConversationEvent }> {
    try {
      const doc = await this.eventModel.create({
        sessionId: input.sessionId,
        eventId: input.eventId,
        type: input.type,
        payload: input.payload,
        timestamp: input.timestamp,
      });
      return { created: true, event: doc.toObject() };
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code === 11000) {
        const existing = await this.eventModel
          .findOne({ sessionId: input.sessionId, eventId: input.eventId })
          .lean()
          .exec();
        if (!existing) {
          throw err;
        }
        return { created: false, event: existing as ConversationEvent };
      }
      throw err;
    }
  }

  async countBySessionId(sessionId: string): Promise<number> {
    return this.eventModel.countDocuments({ sessionId }).exec();
  }

  async findBySessionOrdered(
    sessionId: string,
    skip: number,
    limit: number,
  ): Promise<ConversationEvent[]> {
    return this.eventModel
      .find({ sessionId })
      .sort({ timestamp: 1, eventId: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as Promise<ConversationEvent[]>;
  }
}
