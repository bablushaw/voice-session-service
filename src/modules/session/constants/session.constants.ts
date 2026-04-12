export enum SessionStatus {
  INITIATED = 'initiated',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** Supported session languages (ISO 639-1 style codes for voice/STT routing). */
export enum SessionLanguage {
  EN = 'en',
  FR = 'fr',
  ES = 'es',
  DE = 'de',
  PT = 'pt',
  IT = 'it',
  HI = 'hi',
  JA = 'ja',
  ZH = 'zh',
  AR = 'ar',
  KO = 'ko',
  NL = 'nl',
  PL = 'pl',
  RU = 'ru',
  TR = 'tr',
  VI = 'vi',
}

export enum ConversationEventType {
  USER_SPEECH = 'user_speech',
  BOT_SPEECH = 'bot_speech',
  SYSTEM = 'system',
}
