import 'dotenv/config';

import { writeFileSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

function registerJsonBigIntSerializer(): void {
  const proto = BigInt.prototype as bigint & { toJSON?: () => string };

  // Express serializes some legacy-compatible responses directly, so keep
  // BigInt IDs JSON-safe even if a route bypasses the response interceptor.
  proto.toJSON ??= function toJSON() {
    return this.toString();
  };
}

async function bootstrap(): Promise<void> {
  registerJsonBigIntSerializer();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    credentials: true,
    origin: true,
  });

  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NoWayHome API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  if (process.env.NODE_ENV !== 'production') {
    writeFileSync(
      join(process.cwd(), 'swagger-spec.json'),
      JSON.stringify(swaggerDocument, null, 2),
    );
  }

  SwaggerModule.setup('api-docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
