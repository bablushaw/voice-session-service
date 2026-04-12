import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsISO8601,
} from 'class-validator';
import { SessionLanguage } from '../constants/session.constants';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Unique session id provided by the upstream voice/call system',
    example: 'call-550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Session language (supported locale codes)',
    enum: SessionLanguage,
    example: SessionLanguage.EN,
  })
  @IsEnum(SessionLanguage)
  language: SessionLanguage;

  @ApiPropertyOptional({
    description: 'Session start time (ISO 8601); defaults to server time if omitted',
    example: '2026-01-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary metadata (caller id, provider, etc.)',
    type: 'object',
    additionalProperties: true,
    example: { provider: 'twilio', direction: 'inbound' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
