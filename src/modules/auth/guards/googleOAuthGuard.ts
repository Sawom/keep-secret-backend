import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // সরাসরি সুপার ক্লাসের ক্যান-অ্যাক্টিভেট কল করলেই কাজ করবে
        const activate = (await super.canActivate(context)) as boolean;
        return activate;
    }

    getAuthenticateOptions(context: ExecutionContext) {
        return {
            scope: ['email', 'profile'],
            prompt: 'select_account', // অ্যাকাউন্ট সিলেকশন পপআপ দেখানোর জন্য
        };
    }
}