import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConversationSession,
  ConversationSessionSchema,
} from './schemas/conversation-session.schema';
import {
  ConversationEvent,
  ConversationEventSchema,
} from './schemas/conversation-event.schema';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionRepository } from './repositories/session.repository';
import { EventRepository } from './repositories/event.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConversationSession.name, schema: ConversationSessionSchema },
      { name: ConversationEvent.name, schema: ConversationEventSchema },
    ]),
  ],
  controllers: [SessionController],
  providers: [SessionService, SessionRepository, EventRepository],
  exports: [SessionService],
})
export class SessionModule {}
