let cachedServer: any;

async function bootstrap() {
    if (!cachedServer) {
        // eval দিয়ে ডায়নামিক ইমপোর্ট করার কারণে Vercel বা TypeScript এটাকে কোনোভাবেই require()-এ রূপান্তর করতে পারবে না
        const express = (await eval(`import('express')`)).default;
        const { ExpressAdapter } = await eval(`import('@nestjs/platform-express')`);
        const { NestFactory } = await eval(`import('@nestjs/core')`);
        const { AppModule } = await eval(`import('../src/app.module.js')`);

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