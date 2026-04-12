import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3010;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  const allowedOrigins =
    corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  const swaggerPath = configService.get<string>('SWAGGER_PATH', 'api/docs');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Voice Session Service')
    .setDescription(
      'REST API for Voice AI conversation sessions: idempotent session upsert, immutable events, pagination, completion.',
    )
    .setVersion('1.0')
    .addTag('sessions', 'Conversation sessions & events')
    .addTag('health', 'Service & dependency health')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, document, {
    customSiteTitle: 'Voice Session API',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  const baseUrl = `http://localhost:${port}`;
  console.log(`Voice Session Service — ${baseUrl}`);
  console.log(`Swagger UI — ${baseUrl}/${swaggerPath}`);
}

bootstrap();
