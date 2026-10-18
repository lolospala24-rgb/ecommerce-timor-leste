import { Test, TestingModule } from '@nestjs/testing';
import { VideosRepository } from './videos.repository';
import { PrismaService } from '../../prisma/prisma.service';

// Covers the comment-like fix: liking a comment used to be a bare
// `increment` with no identity check at all, so any authenticated user
// could inflate a comment's like count without limit and there was no
// "unlike". Now backed by a VideoCommentLike join table (same idiom as
// VideoLike for videos) — these tests are the regression net for that
// dedup + isLiked-attachment behavior.
describe('VideosRepository — comment likes', () => {
  let repo: VideosRepository;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      videoComment: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      videoCommentLike: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [VideosRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repo = module.get(VideosRepository);
  });

  describe('likeComment', () => {
    it('creates the like and increments the counter on a first-time like', async () => {
      prisma.videoCommentLike.create.mockResolvedValue({ id: 1 });
      prisma.videoComment.update.mockResolvedValue({ likes: 5 });
      // findUnique is called via the chained select at the end — add it here
      prisma.videoComment.findUnique = jest.fn().mockResolvedValue({ likes: 5 });

      const result = await repo.likeComment(10, 42);

      expect(prisma.videoCommentLike.create).toHaveBeenCalledWith({ data: { commentId: 10, userId: 42 } });
      expect(prisma.videoComment.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { likes: { increment: 1 } },
      });
      expect(result).toEqual({ likes: 5 });
    });

    it('does not double-increment when the same user likes the same comment again (P2002)', async () => {
      prisma.videoCommentLike.create.mockRejectedValue({ code: 'P2002' });
      prisma.videoComment.findUnique = jest.fn().mockResolvedValue({ likes: 5 });

      await repo.likeComment(10, 42);

      expect(prisma.videoComment.update).not.toHaveBeenCalled();
    });

    it('re-throws an unrelated database error rather than silently treating it as "already liked"', async () => {
      const unrelated = new Error('connection reset');
      prisma.videoCommentLike.create.mockRejectedValue(unrelated);
      prisma.videoComment.findUnique = jest.fn();

      await expect(repo.likeComment(10, 42)).rejects.toBe(unrelated);
      expect(prisma.videoComment.update).not.toHaveBeenCalled();
    });
  });

  describe('unlikeComment', () => {
    it('decrements the counter when a like actually existed', async () => {
      prisma.videoCommentLike.deleteMany.mockResolvedValue({ count: 1 });
      prisma.videoComment.update.mockResolvedValue({ likes: 4 });
      prisma.videoComment.findUnique = jest.fn().mockResolvedValue({ likes: 4 });

      await repo.unlikeComment(10, 42);

      expect(prisma.videoComment.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { likes: { decrement: 1 } },
      });
    });

    it('does not decrement when there was nothing to unlike', async () => {
      prisma.videoCommentLike.deleteMany.mockResolvedValue({ count: 0 });
      prisma.videoComment.findUnique = jest.fn().mockResolvedValue({ likes: 5 });

      await repo.unlikeComment(10, 42);

      expect(prisma.videoComment.update).not.toHaveBeenCalled();
    });
  });

  describe('findComments — isLiked attachment', () => {
    const parent = { id: 1, replies: [{ id: 2, replies: [] }] };
    const other = { id: 3, replies: [] };

    it('marks every comment (including nested replies) isLiked:false for an anonymous viewer', async () => {
      prisma.videoComment.findMany.mockResolvedValue([parent, other]);
      prisma.videoComment.count = jest.fn().mockResolvedValue(2);

      const { items } = await repo.findComments(99, {}, undefined);

      expect(items[0].isLiked).toBe(false);
      expect(items[0].replies[0].isLiked).toBe(false);
      expect(items[1].isLiked).toBe(false);
      expect(prisma.videoCommentLike.findMany).not.toHaveBeenCalled();
    });

    it("only marks the viewer's own liked comments (parent or reply) isLiked:true", async () => {
      prisma.videoComment.findMany.mockResolvedValue([parent, other]);
      prisma.videoComment.count = jest.fn().mockResolvedValue(2);
      prisma.videoCommentLike.findMany.mockResolvedValue([{ commentId: 2 }]); // only the reply

      const { items } = await repo.findComments(99, {}, 42);

      expect(items[0].isLiked).toBe(false); // parent, not liked
      expect(items[0].replies[0].isLiked).toBe(true); // reply, liked
      expect(items[1].isLiked).toBe(false);
    });
  });
});
