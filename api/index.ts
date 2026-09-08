import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

let app: any;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule);
    
    app.enableCors({
      origin: '*', // পরবর্তীতে ফ্রন্টএন্ড ডোমোেইন এখানে নির্দিষ্ট করা যাবে
      credentials: true,
    });
    
    await app.init();
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const instance = await bootstrap();
  const server = instance.getHttpAdapter().getInstance();
  return server(req, res);
}