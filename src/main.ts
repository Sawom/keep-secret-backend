import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // Enable CORS for Next.js Frontend
  app.enableCors();

  // Enable Global Input Validation Pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.init();

  // শুধুমাত্র লোকাল ডেভেলপমেন্টে (`npm run start:dev`) পোর্ট লিসেন করবে
  if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 5000;
    await app.listen(port);
    console.log(`KeepSecret Backend running on: http://localhost:${port}`);
  }
}

bootstrap();

// Vercel-এর সার্ভারলেস ফাংশনের জন্য এটি এক্সপোর্ট করা জরুরি
export default server;