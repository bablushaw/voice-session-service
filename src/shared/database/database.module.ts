import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');

        const mongoUri = configService.get<string>('MONGODB_URI');

        if (mongoUri) {
          logger.log('Using MONGODB_URI for connection');
          return { uri: mongoUri };
        }

        const host = configService.get<string>('MONGODB_HOST', 'localhost');
        const port = configService.get<number>('MONGODB_PORT', 27017);
        const database = configService.get<string>('MONGODB_NAME', 'voice_session_db');
        const user = configService.get<string>('MONGODB_USER');
        const password = configService.get<string>('MONGODB_PASSWORD');

        let uri: string;
        if (user && password) {
          uri = `mongodb://${user}:${password}@${host}:${port}/${database}`;
          logger.log(`Connecting to MongoDB with authentication: ${host}:${port}/${database}`);
        } else {
          uri = `mongodb://${host}:${port}/${database}`;
          logger.log(`Connecting to MongoDB without authentication: ${host}:${port}/${database}`);
        }

        return { uri };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
