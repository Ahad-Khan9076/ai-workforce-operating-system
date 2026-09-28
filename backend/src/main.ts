import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(configService.get<string>('api.globalPrefix') ?? 'api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get<string>('api.defaultVersion') ?? '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const origins = configService.get<string[]>('cors.origins') ?? [];
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
}
await bootstrap();
