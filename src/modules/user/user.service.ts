import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) { }

  /**
   * [১. ইউজারের প্রোফাইল ডাটা পাওয়া]
   * পাসওয়ার্ড হ্যাশ বা অন্যান্য সেন্সিটিভ ফিল্ড ফিল্টার করে রিটার্ন করা হয়।
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  /**
   * [২. ইউজারের নাম (fullName) আপডেট করা]
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        updatedAt: true,
      },
    });

    // [Audit Log Trigger]: প্রোফাইল আপডেট করার সিকিউরিটি রেকর্ড
    await this.auditLogService.log(userId, {
      action: 'USER_PROFILE_UPDATE',
      details: { updatedName: dto.fullName },
    });

    return updatedUser;
  }
}