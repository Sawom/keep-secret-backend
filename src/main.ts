import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Next.js Frontend
  app.enableCors();

  // Enable Global Input Validation Pipes
  // এটি ক্লায়েন্ট থেকে পাঠানো ডাটা DTO-র রুলস অনুযায়ী ভ্যালিডেট করবে।
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // DTO-তে ডিফাইন করা নাই এমন অতিরিক্ত ফিল্ড আসলে তা অটোমেটিক রিমুভ করে দেবে (Over-posting সিকিউরিটি)
    forbidNonWhitelisted: true, // DTO-তে নেই এমন ফিল্ড পাঠালে রিকোয়েস্ট ব্লক করে এরর দেবে
    transform: true, // ক্লায়েন্টের ইনপুট ডাটা টাইপকে DTO-র টাইপে অটো রূপান্তর করবে
  }));

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`KeepSecret Backend running on: http://localhost:${port}`);
}
bootstrap();