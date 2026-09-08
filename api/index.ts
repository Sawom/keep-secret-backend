import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let cachedServer: any;

async function bootstrap() {
    if (!cachedServer) {
        const { NestFactory } = await import('@nestjs/core');
        const { AppModule } = await import('../src/app.module.js');

        const app = await NestFactory.create(
            AppModule,
            new ExpressAdapter(server),
        );
        app.enableCors({
            origin: '*',
            credentials: true,
        });
        await app.init();
        cachedServer = server;
    }
    return cachedServer;
}

export default async function handler(req: any, res: any) {
    const appServer = await bootstrap();
    return appServer(req, res);
}