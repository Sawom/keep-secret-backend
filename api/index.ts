let cachedServer: any;

async function bootstrap() {
    if (!cachedServer) {
        const express = (await import('express')).default;
        const { ExpressAdapter } = await import('@nestjs/platform-express');
        const { NestFactory } = await import('@nestjs/core');
        const { AppModule } = await import('../src/app.module.js');

        const server = express();
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
    try {
        const appServer = await bootstrap();
        return appServer(req, res);
    } catch (error: any) {
        console.error('CRITICAL SERVERLESS ERROR:', error);
        return res.status(500).json({
            message: 'Internal Serverless Error',
            error: error.message,
            stack: error.stack,
        });
    }
}