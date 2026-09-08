import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let appPromise: Promise<any>;

async function bootstrap() {
    const { AppModule } = await import('../src/app.module');
    const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
    );
    app.enableCors({
        origin: '*',
        credentials: true,
    });
    await app.init();
    return server;
}

export default async function handler(req: any, res: any) {
    if (!appPromise) {
        appPromise = bootstrap();
    }
    const appServer = await appPromise;
    return appServer(req, res);
}