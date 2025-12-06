import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Validation Pipes globally applied
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('AI Document Summarizer')
    .setDescription('Upload a document and get an AI-powered summary + metadata')
    .setVersion('1.0')
    .build(); 

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log(`API running on http://localhost:3000/api`);
  console.log(`Swagger docs at http://localhost:3000/api/docs`);
}

bootstrap();
