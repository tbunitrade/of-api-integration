import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestExpressApplication } from '@nestjs/platform-express';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('Of-Software')
    .setDescription('Of-Software API Description')
    .setVersion('1.0')
    .addTag('Of-Software') // Optional: Add tags for grouping API endpoints
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'jwt',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Enable CORS
  const corsOptions: CorsOptions = {
    origin: true, // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    // credentials: true,
  };
  app.enableCors(corsOptions);
  app.useStaticAssets('uploads', {
    prefix: '/uploads',
  });
  app.use(bodyParser.json({ limit: '10gb' }));
  app.use(bodyParser.urlencoded({ limit: '10gb', extended: true }));
  const server = app.getHttpServer();
  server.setTimeout(1 * 60 * 60 * 1000); // Timeout 1 hours

  // The number of milliseconds of inactivity a server needs to wait for additional incoming data
  server.keepAliveTimeout = 1 * 60 * 60 * 1000;
  // Limit the amount of time the parser will wait to receive the complete HTTP headers
  server.headersTimeout = 1 * 60 * 61 * 1000;
  await app.listen(3000);
}
bootstrap();
