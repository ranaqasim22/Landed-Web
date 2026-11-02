import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommunityPatterns } from '@app/common';
import type {
  PostActionInput,
  PostContentInput,
  ReactionType,
} from '@app/common';
import { PostsService } from './posts.service.js';

@Controller()
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @MessagePattern(CommunityPatterns.createPost)
  create(@Payload() input: { userId: string; content: PostContentInput }) {
    return this.posts.create(input.userId, input.content);
  }

  @MessagePattern(CommunityPatterns.updatePost)
  update(
    @Payload()
    {
      changes,
      ...action
    }: PostActionInput & {
      changes: Partial<PostContentInput>;
    },
  ) {
    return this.posts.update(action, changes);
  }

  @MessagePattern(CommunityPatterns.deletePost)
  remove(@Payload() input: PostActionInput) {
    return this.posts.remove(input);
  }

  @MessagePattern(CommunityPatterns.setReaction)
  setReaction(
    @Payload() { type, ...action }: PostActionInput & { type: ReactionType },
  ) {
    return this.posts.setReaction(action, type);
  }

  @MessagePattern(CommunityPatterns.removeReaction)
  removeReaction(@Payload() input: PostActionInput) {
    return this.posts.removeReaction(input);
  }

  @MessagePattern(CommunityPatterns.savePost)
  save(@Payload() input: PostActionInput) {
    return this.posts.save(input);
  }

  @MessagePattern(CommunityPatterns.unsavePost)
  unsave(@Payload() input: PostActionInput) {
    return this.posts.unsave(input);
  }
}
