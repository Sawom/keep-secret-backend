import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';

let cachedServer: any;

async function bootstrap() {
    const server = express();

    const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
    );

    app.enableCors({
        origin: '*',
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    await app.init();

    return server;
}

export default async function handler(req: any, res: any) {
    try {
        if (!cachedServer) {
            cachedServer = await bootstrap();
        }

        return cachedServer(req, res);
    } catch (error: any) {
        console.error('Bootstrap Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Bootstrap failed',
            error: error.message,
        });
    }
}