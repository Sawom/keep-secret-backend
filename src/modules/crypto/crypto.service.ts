import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

// @Injectable: এটি NestJS-কে বলে যে এই Class-টি একটি Service, যা অন্য যেকোনো Module-এ Inject (ব্যবহার) করা যাবে।
@Injectable()
export class CryptoService {
    // AES-256-GCM অ্যালগরিদম যা ডাটা এনক্রিপশনের পাশাপাশি ডাটা টেম্পারিং (Tampering) রোধ করে
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // AES-256 এর জন্য ঠিক 32 বাইট (256 bits) দৈর্ঘ্য লাগে

    /**
     * [১. সিক্রেট কী জেনারেটর]
     * যেকোনো দৈর্ঘ্যের পাসওয়ার্ড বা টেস্ট কী-কে scrypt অ্যালগরিদম দিয়ে ঠিক 32-বাইট সিকিউর বাইনারি কি-তে রূপান্তর করে।
     */
    private getSecretKey(userKey?: string): Buffer {
        const baseKey = userKey || process.env.JWT_SECRET || 'fallback-super-secret-key-32bytes!';
        return crypto.scryptSync(baseKey, 'salt', this.keyLength);
    }

    /**
     * [২. এনক্রিপশন ফাংশন]
     * সাধারণ টেক্সট গ্রহণ করে এনক্রিপ্টেড ডাটা, ১৬ বাইটের ইউনিক IV (Initialization Vector) এবং Auth Tag তৈরি করে।
     */
    encrypt(text: string, userKey?: string): { encryptedData: string; iv: string; authTag: string } {
        // প্রতিবার এনক্রিপশনের জন্য ইউনিক ১৬ বাইটের র্যান্ডম ভ্যালু তৈরি (যাতে একই টেক্সট বারবার আলাদা দেখায়)
        const iv = crypto.randomBytes(16);
        const key = this.getSecretKey(userKey);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);

        // প্লেইন টেক্সটকে হেক্সাডেসিমেল এনক্রিপ্টেড কোডে রূপান্তর
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // ডাটা পরবর্তীতে পরিবর্তন করা হয়েছে কি না তা ভ্যালিডেট করার জন্য সিকিউরিটি ট্যাগ গ্রহণ
        const authTag = cipher.getAuthTag().toString('hex');

        return {
            encryptedData: encrypted,
            iv: iv.toString('hex'),
            authTag,
        };
    }

    /**
     * [৩. ডিক্রিপশন ফাংশন]
     * এনক্রিপ্টেড টেক্সট, IV এবং Auth Tag মিলিয়ে চেক করে আসল প্লেইন টেক্সট ফেরত দেয়।
     */
    decrypt(encryptedData: string, iv: string, authTag: string, userKey?: string): string {
        const key = this.getSecretKey(userKey);
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            key,
            Buffer.from(iv, 'hex'),
        );

        // সিকিউরিটি ট্যাগ সেট করে এনক্রিপ্টেড ডাটা কেউ ম্যানুয়ালি টেম্পার করেছে কি না ভ্যালিডেট করা
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        // এনক্রিপ্টেড কোড ডিক্রিপ্ট করে মূল প্লেইন টেক্সটে ফিরিয়ে আনা
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}