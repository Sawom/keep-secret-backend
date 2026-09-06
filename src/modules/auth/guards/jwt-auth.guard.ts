import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 'jwt' স্ট্র্যাটেজি ব্যবহার করে তৈরি করা গ্লোবাল/কাস্টম গার্ড
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }