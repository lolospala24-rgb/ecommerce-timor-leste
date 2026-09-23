import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

// Reddit/Hacker-News-style "hot" ranking: weighted engagement divided by
// age raised to a gravity exponent — a video's score decays smoothly as it
// ages, so a fresh video with modest engagement can still outrank an old
// video with a large lifetime view count ("a video from yesterday should
// be able to become trending", per the original spec). Shares count for
// more than likes, likes more than views, since each is progressively
// harder to earn and a stronger trust signal.
const VIEW_WEIGHT = 1;
const LIKE_WEIGHT = 3;
const SHARE_WEIGHT = 5;
const GRAVITY = 1.5;
// Keeps the score finite (division by ~0) for a video published seconds
// ago, and caps how much a video can dominate purely from being brand new.
const AGE_OFFSET_HOURS = 2;

/**
 * Recomputes every published video's trendingScore on a schedule, so the
 * `trending` feed tab stays a cheap single-column `orderBy` at request
 * time instead of an aggregate/weighted query run on every page load.
 */
@Injectable()
export class TrendingScoreJob {
  private readonly logger = new Logger(TrendingScoreJob.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async recomputeScores() {
    const videos = await this.prisma.video.findMany({
      where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
      select: { id: true, views: true, likes: true, shares: true, publishedAt: true, createdAt: true },
    });

    if (videos.length === 0) return;

    const now = Date.now();
    await Promise.all(
      videos.map((video) => {
        const ageHours = (now - (video.publishedAt ?? video.createdAt).getTime()) / (1000 * 60 * 60);
        const engagement = video.views * VIEW_WEIGHT + video.likes * LIKE_WEIGHT + video.shares * SHARE_WEIGHT;
        const trendingScore = engagement / Math.pow(Math.max(ageHours, 0) + AGE_OFFSET_HOURS, GRAVITY);
        return this.prisma.video.update({ where: { id: video.id }, data: { trendingScore } });
      }),
    );

    this.logger.log(`Recomputed trending scores for ${videos.length} video(s)`);
  }
}
