let cachedServer: any;

async function bootstrap() {
    if (!cachedServer) {
        // সব ইমপোর্ট ডাইনামিকালি ইমপোর্ট করা হলো যাতে ERR_REQUIRE_ESM না আসে
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
    const appServer = await bootstrap();
    return appServer(req, res);
}