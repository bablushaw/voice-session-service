import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ConversationEventType } from '../constants/session.constants';

export type ConversationEventDocument = HydratedDocument<ConversationEvent>;

@Schema({
  collection: 'conversation_events',
  timestamps: false,
})
export class ConversationEvent {
  /** MongoDB document id (ObjectId). */
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  eventId: string;

  @Prop({ required: true, enum: ConversationEventType })
  type: ConversationEventType;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop({ required: true, type: Date, index: true })
  timestamp: Date;
}

export const ConversationEventSchema = SchemaFactory.createForClass(ConversationEvent);

/** Unique (sessionId, eventId) and sort-friendly index for pagination */
ConversationEventSchema.index({ sessionId: 1, eventId: 1 }, { unique: true });
ConversationEventSchema.index({ sessionId: 1, timestamp: 1 });
