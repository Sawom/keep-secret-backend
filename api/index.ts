import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: any;

async function bootstrap() {
    if (!app) {
        // Vercel-এর কমনজেএস হ্যান্ডলার যেন ক্র্যাশ না করে, সেজন্য সরাসরি ডিস্ক থেকে Nestjs বিল্ড হ্যান্ডেল করা
        process.env.NODE_ENV = 'production';

        // ডাইনামিক ইমপোর্টেররর এড়াতে মডিউল ক্যাশিং বাইপাস করা
        const { NestFactory } = await import('@nestjs/core');
        const { ExpressAdapter } = await import('@nestjs/platform-express');
        const express = (await import('express')).default;

        const server = express();

        // কম্পাইল করা মেইন মডিউল লোড করা
        const nestAppPath = '../dist/main.js';

        // অথবা সরাসরি AppModule লোড করে এক্সপ্রেস এডাপ্টার বসানো
        const { AppModule } = await import('../src/app.module.js');

        const nestApp = await NestFactory.create(
            AppModule,
            new ExpressAdapter(server),
        );

        nestApp.enableCors({
            origin: '*',
            credentials: true,
        });

        await nestApp.init();
        app = server;
    }
    return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const server = await bootstrap();
        return server(req, res);
    } catch (error: any) {
        console.error('Vercel Serverless Execution Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Serverless bootstrap failed',
            error: error.message,
            stack: error.stack,
        });
    }
}