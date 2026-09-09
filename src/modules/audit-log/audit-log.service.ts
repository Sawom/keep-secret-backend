import { Injectable } from '@nestjs/common';
import { CreateAuditLogDto } from './dto/create-audit-log.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * [১. অডিট লগ তৈরি করা]
   * কী কাজ করে: সিস্টেমের অন্য যেকোনো সার্ভিস (যেমন Auth, Note) থেকে এই মেথড ডেকে লগ সেভ করা যাবে।
   */
  async log(userId: string, dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action: dto.action,
        userAgent: dto.userAgent ?? null,
        ipAddress: dto.ipAddress ?? null,
        // details না থাকলে Prisma.DbNull অথবা Prisma.JsonNull ব্যবহার করতে পারো
        details: dto.details ? (dto.details as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }

  /**
   * [২. ইউজারের অডিট লগ গেট করা]
   * কী কাজ করে: নির্দিষ্ট ইউজারের সিকিউরিটি হিস্ট্রি রিভার্স ক্রোনোলজিক্যাল অর্ডারে (নতুন থেকে পুরোনো) প্রদান করে।
   */
  async findAllByUser(userId: string, limit: number = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
  }

}
