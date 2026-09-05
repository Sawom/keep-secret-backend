import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for Next.js Frontend
  app.enableCors();
  
  // Enable Global Input Validation Pipes
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  
  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`KeepSecret Backend running on: http://localhost:${port}`);
}
bootstrap();