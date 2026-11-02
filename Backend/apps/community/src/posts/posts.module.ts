import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostViewsService } from './post-views.service.js';
import { Post, PostSchema } from './post.schema.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';
import { Reaction, ReactionSchema } from './reaction.schema.js';
import { SavedPost, SavedPostSchema } from './saved-post.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Reaction.name, schema: ReactionSchema },
      { name: SavedPost.name, schema: SavedPostSchema },
    ]),
  ],
  controllers: [PostsController],
  providers: [PostsService, PostViewsService],
  exports: [MongooseModule, PostViewsService],
})
export class PostsModule {}
