let cachedServer: any;

async function bootstrap() {
    if (!cachedServer) {
        // ডাইনামিক ইমপোর্টের মাধ্যমে কমনজেএস এনভায়রনমেন্টে ইএসএম লোড করা হচ্ছে
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
        const server = await bootstrap();
        return server(req, res);
    } catch (error: any) {
        console.error('Serverless Bootstrap Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Bootstrap failed',
            error: error.message,
            stack: error.stack,
        });
    }
}