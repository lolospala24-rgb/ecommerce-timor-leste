import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Flips SCHEDULED videos to PUBLISHED once their publishedAt time arrives —
 * the actual mechanism behind the admin "Scheduled" status/tab, not just a
 * label. Runs every minute since a scheduled publish is a user-visible
 * moment (the video appearing in the customer feed) that shouldn't lag an
 * hour behind what the admin picked.
 */
@Injectable()
export class VideoScheduleJob {
  private readonly logger = new Logger(VideoScheduleJob.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDueVideos() {
    const due = await this.prisma.video.findMany({
      where: { status: 'SCHEDULED', publishedAt: { lte: new Date() } },
      select: { id: true },
    });

    if (due.length === 0) return;

    await this.prisma.video.updateMany({
      where: { id: { in: due.map((v) => v.id) } },
      data: { status: 'PUBLISHED' },
    });

    this.logger.log(`Auto-published ${due.length} scheduled video(s)`);
  }
}
