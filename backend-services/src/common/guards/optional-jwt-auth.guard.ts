import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Same JWT strategy as JwtAuthGuard, but never rejects the request for a
 * missing/invalid token — it just leaves `request.user` unset. Use on
 * @Public() routes that behave differently for a logged-in caller (e.g.
 * the video feed including `isLiked`/`isSaved` for the current user).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
