
import { Injectable } from '@nestjs/common';
import { AuditLogService } from './../modules/audit-log/audit-log.service.js';
import { PrismaService } from './../modules/prisma/prisma.service.js';
import { CryptoService } from './../modules/crypto/crypto.service.js';

@Injectable()
export class TrashService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogService: AuditLogService,
        private readonly cryptoService: CryptoService,
    ) { }


    /**
   * নোট ডিক্রিপ্ট করার জন্য helper function
   */
    private decryptNote(note: any) {
        if (!note) return note;
        try {
            return {
                ...note,
                title: note.title && note.titleIv && note.titleAuthTag
                    ? this.cryptoService.decrypt(note.title, note.titleIv, note.titleAuthTag)
                    : note.title,
                content: note.content && note.contentIv && note.contentAuthTag
                    ? this.cryptoService.decrypt(note.content, note.contentIv, note.contentAuthTag)
                    : note.content,
            };
        } catch (error) {
            return note;
        }
    }

    /**
     * [GET /trash]
     * User-এর সব trashed notes এবং notebooks একসাথে return করবে।
     */
    async getTrash(userId: string) {
        const [notes, notebooks] = await Promise.all([
            this.prisma.note.findMany({
                where: {
                    userId,
                    isDeleted: true,
                },
                orderBy: {
                    deletedAt: 'desc',
                },
            }),

            this.prisma.notebook.findMany({
                where: {
                    userId,
                    isDeleted: true,
                },
                orderBy: {
                    deletedAt: 'desc',
                },
            }),
        ]);

        // Protiṭi note-ke decrypt kora holo
        const decryptedNotes = notes.map((note) => this.decryptNote(note));

        return {
            notes: decryptedNotes,
            notebooks,
        };
    }

    /**
     * [DELETE /trash/empty]
     *
     * User-এর সব trashed notes এবং notebooks
     * একটি transaction-এর মধ্যে permanently delete করবে।
     */
    async emptyTrash(userId: string) {
        const result = await this.prisma.$transaction(async (tx) => {
            /**
             * আগে trashed notes permanently delete
             */
            const deletedNotes = await tx.note.deleteMany({
                where: {
                    userId,
                    isDeleted: true,
                },
            });

            /**
             * তারপর trashed notebooks permanently delete
             */
            const deletedNotebooks = await tx.notebook.deleteMany({
                where: {
                    userId,
                    isDeleted: true,
                },
            });

            return {
                notes: deletedNotes.count,
                notebooks: deletedNotebooks.count,
            };
        });

        await this.auditLogService.log(
            userId,
            {
                action: 'TRASH_EMPTY',
                details: result,
            },
        );

        return {
            message: 'Trash emptied successfully',
            ...result,
        };
    }
}