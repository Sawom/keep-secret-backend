import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// @Injectable: এটি NestJS-কে বলে যে এই Class-টি একটি Service যা অন্য যেকোনো Module-এ Inject করে ব্যবহার করা যাবে।
@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    /**
     * [১. Module initialization Lifecycle Hook ]
     * NestJS অ্যাপ্লিকেশন যখন চালু হবে, এটি সাথে সাথে PostgreSQL ডাটাবেসের সাথে সংযোগ (Connection) স্থাপন করবে।
     */
    async onModuleInit() {
        await this.$connect();
    }

    /**
     * [২. Module Destroy Lifecycle Hook]
     * NestJS অ্যাপ্লিকেশন বন্ধ করার সময় এটি ডেটাবেস সংযোগটি নিরাপদে বন্ধ (Disconnect) করবে,
     * যাতে কোনো Connection Leak না হয়।
     */
    async onModuleDestroy() {
        await this.$disconnect();
    }
}


/**
    PrismaService এর প্রয়োজনীয়তা
    NestJS অ্যাপ্লিকেশনে Prisma Client সরাসরি প্রতিটি সার্ভিস ফাইলে ব্যবহার করা যায়, তবে তা ইন্ডাস্ট্রি বেস্ট প্র্যাকটিস নয়। PrismaService ব্যবহারের কারণগুলো:
    1. Centralized Lifecycle Management: অ্যাপ যখন চালু হয় (onModuleInit), এটি ডাটাবেস কানেকশন খোলে। আর যখন অ্যাপ বন্ধ হয় (onModuleDestroy), এটি নিরাপদে কানেকশন ক্লোজ করে।
    2. Dependency Injection (DI): একবার PrismaModule জেনারেট করে নিলে পুরো অ্যাপ্লিকেশনের যেকোনো সার্ভিসে (AuthService, NotesService) খুব সহজে Prisma-কে ইনজেক্ট করে ব্যবহার করা যায়।
*/