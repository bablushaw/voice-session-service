import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SessionLanguage, SessionStatus } from '../constants/session.constants';

export type ConversationSessionDocument = HydratedDocument<ConversationSession>;

@Schema({
  collection: 'conversation_sessions',
  timestamps: false,
})
export class ConversationSession {
  /** MongoDB document id (ObjectId). */
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({
    required: true,
    enum: SessionStatus,
    default: SessionStatus.INITIATED,
    index: true,
  })
  status: SessionStatus;

  @Prop({
    required: true,
    enum: SessionLanguage,
    index: true,
  })
  language: SessionLanguage;

  @Prop({ required: true, type: Date })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;
}

export const ConversationSessionSchema = SchemaFactory.createForClass(ConversationSession);
