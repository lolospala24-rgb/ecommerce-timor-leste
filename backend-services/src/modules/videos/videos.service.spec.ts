import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosRepository } from './videos.repository';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { RedisService } from '../../redis/redis.service';

describe('VideosService', () => {
  let service: VideosService;
  let repo: any;
  let cloudinaryService: any;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findComments: jest.fn(),
      findCommentById: jest.fn(),
      likeComment: jest.fn(),
      unlikeComment: jest.fn(),
    };
    cloudinaryService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        { provide: VideosRepository, useValue: repo },
        { provide: CloudinaryService, useValue: cloudinaryService },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn() } },
      ],
    }).compile();

    service = module.get(VideosService);
  });

  describe('likeComment / unlikeComment', () => {
    it('likeComment 404s when the comment does not exist', async () => {
      repo.findCommentById.mockResolvedValue(null);
      await expect(service.likeComment(1, 42)).rejects.toThrow(NotFoundException);
      expect(repo.likeComment).not.toHaveBeenCalled();
    });

    it('likeComment delegates to the repo with the real caller id, not a shared anonymous counter', async () => {
      repo.findCommentById.mockResolvedValue({ id: 1 });
      repo.likeComment.mockResolvedValue({ likes: 3 });

      const result = await service.likeComment(1, 42);

      expect(repo.likeComment).toHaveBeenCalledWith(1, 42);
      expect(result).toEqual({ liked: true, likes: 3 });
    });

    it('unlikeComment 404s when the comment does not exist', async () => {
      repo.findCommentById.mockResolvedValue(null);
      await expect(service.unlikeComment(1, 42)).rejects.toThrow(NotFoundException);
    });

    it('unlikeComment delegates to the repo and reports liked:false', async () => {
      repo.findCommentById.mockResolvedValue({ id: 1 });
      repo.unlikeComment.mockResolvedValue({ likes: 2 });

      const result = await service.unlikeComment(1, 42);

      expect(repo.unlikeComment).toHaveBeenCalledWith(1, 42);
      expect(result).toEqual({ liked: false, likes: 2 });
    });
  });

  describe('getComments', () => {
    it('passes the viewer id through so the repo can attach per-user isLiked state', async () => {
      repo.findById.mockResolvedValue({ id: 5 });
      repo.findComments.mockResolvedValue({ items: [], total: 0 });

      await service.getComments(5, { page: 1, limit: 20 }, 42);

      expect(repo.findComments).toHaveBeenCalledWith(5, { page: 1, limit: 20 }, 42);
    });
  });

  describe('create() — scheduling validation', () => {
    it('rejects SCHEDULED status with no publishedAt', async () => {
      repo.create = jest.fn();
      await expect(service.create({ status: 'SCHEDULED' } as any)).rejects.toThrow(
        'publishedAt is required when scheduling a video',
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects SCHEDULED status with a publishedAt that is not in the future', async () => {
      repo.create = jest.fn();
      const past = new Date(Date.now() - 60_000).toISOString();
      await expect(service.create({ status: 'SCHEDULED', publishedAt: past } as any)).rejects.toThrow(
        'Scheduled publish time must be in the future',
      );
    });
  });

  describe('remove() — Cloudinary cleanup never blocks the delete', () => {
    it('still deletes the video row even when Cloudinary cleanup fails, and does not throw', async () => {
      repo.findById.mockResolvedValue({ id: 7, videoPublicId: 'pub_1', thumbnailPublicId: 'thumb_1' });
      repo.delete.mockResolvedValue({ id: 7 });
      cloudinaryService.deleteFile.mockRejectedValue(new Error('cloudinary down'));

      await expect(service.remove(7)).resolves.toEqual({ id: 7 });
      // Let the fire-and-forget .catch() microtasks settle before the test ends.
      await new Promise((r) => setImmediate(r));
    });
  });
});
