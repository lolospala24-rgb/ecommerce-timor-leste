Videos module
=================

Overview
--------
This module provides a dedicated `videos` service for hosting short-form product videos that integrate with the existing product catalog. It includes:

- Prisma `Video` model (see prisma/schema.prisma)
- Controller, Service, Repository following existing project patterns
- Public feed endpoint with filters: `popular`, `trending`, `latest`
- CRUD endpoints restricted to `ADMIN` role
- Lightweight analytics endpoints: view, like, share

Prisma schema
-------------
The Prisma model `Video` was added to `src/prisma/schema.prisma`. After pulling changes run:

```bash
npx prisma migrate dev --name add_videos_table
npx prisma generate
```

Endpoints
---------
- GET `/api/videos/feed?filter=popular|trending|latest&page=1&limit=20&categoryId=...` (public)
- GET `/api/videos/:id` (public)
- POST `/api/videos` (admin) — create video
  - supports either `videoUrl` in the JSON body or multipart upload via `video` file
  - optional `thumbnailUrl` string or `thumbnail` file upload
- PATCH `/api/videos/:id` (admin) — update fields and optionally replace `video`/`thumbnail` files
- DELETE `/api/videos/:id` (admin)
- POST `/api/videos/:id/view` (public) — increments view counter
- POST `/api/videos/:id/like` (public) — increments likes
- POST `/api/videos/:id/share` (public) — increments shares

Validation & Uploads
--------------------
- DTOs (`CreateVideoDto`, `UpdateVideoDto`, `FilterVideoDto`) validate inputs using `class-validator`.
- For file uploads (binary video files or thumbnails) integrate with the existing `UploadModule` / `CloudinaryModule`:

  1. Accept multipart form in controller using `@UseInterceptors(FileFieldsInterceptor(...))`.
  2. Inject `CloudinaryService` and call `uploadFile` to obtain `videoUrl` / `thumbnailUrl`.

Permissions
-----------
- Authentication uses existing global `JwtAuthGuard`.
- Create/Update/Delete routes are annotated with `@Roles(Role.ADMIN)`; make sure admin accounts exist.

Integration with frontend (Next.js)
---------------------------------
1. After running migrations, seed some `Video` records or use the admin UI to create videos.
2. Frontend can call `/api/videos/feed` to populate the vertical feed.
3. Use the analytics endpoints when user views/likes/shares — call them from frontend events.
4. For product modal, the `Video.productId` can be used to fetch product details from `/api/products/slug-or-id`.

Performance and optimizations
-----------------------------
- Add DB indexes (already added on `productId`) and consider composite indexes for sorting heavy queries.
- Use Redis caching for feed queries (e.g., top popular/trending) — hook into `RedisModule`.
- Use cursor-based pagination for large datasets if necessary.

Next steps / Recommendations
---------------------------
- Add file upload endpoints and Cloudinary integration for hosting videos.
- Implement background processing for video transcoding & generating thumbnails.
- Add rate limiting for analytics endpoints to avoid fraud (views/likes spam).
