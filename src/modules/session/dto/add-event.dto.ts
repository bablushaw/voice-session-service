import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsISO8601,
} from 'class-validator';
import { ConversationEventType } from '../constants/session.constants';

export class AddEventDto {
  @ApiProperty({
    description: 'Unique event id within this session',
    example: 'evt-001',
  })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ enum: ConversationEventType })
  @IsEnum(ConversationEventType)
  type: ConversationEventType;

  @ApiProperty({
    description: 'Event payload (STT text, TTS metadata, etc.)',
    type: 'object',
    additionalProperties: true,
    example: { text: 'Hello', confidence: 0.98 },
  })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Event time (ISO 8601); defaults to server time',
    example: '2026-01-15T10:00:05.000Z',
  })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;
}
