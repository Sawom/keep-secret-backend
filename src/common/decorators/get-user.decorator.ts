import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        // যদি @GetUser('id') পাঠানো হয় তবে শুধুমাত্র id রিটার্ন করবে, অন্যথায় পুরো user অবজেক্ট
        if (data) {
            return request.user?.[data];
        }
        return request.user;
    },
);