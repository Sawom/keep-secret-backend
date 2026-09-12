import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private readonly authService: AuthService) {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            scope: ['email', 'profile'],
            // এই অপশনটির মাধ্যমে ব্রাউজারে অ্যাকাউন্ট সংখ্যা যাই হোক না কেন, অ্যাকাউন্ট সিলেকশন উইন্ডো আসবেই
            prompt: 'select_account',
        } as any);
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        const { name, emails, id } = profile;
        const googleProfile = {
            email: emails[0].value,
            name: `${name.givenName} ${name.familyName || ''}`.trim(),
            googleId: id,
        };

        const result = await this.authService.validateGoogleUser(googleProfile);
        done(null, result);
    }
}