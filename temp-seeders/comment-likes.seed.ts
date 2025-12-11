import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCommentLikes() {
  console.log('Seeding Comment Likes...');

  // Get all comments to add likes to them
  const comments = await prisma.postComment.findMany({
    select: { id: true, userId: true, postId: true }
  });

  const commentLikes = [];

  // Add likes to comments (users liking other users' comments)
  for (const comment of comments) {
    // Skip if it's the comment author liking their own comment
    const otherUsers = [1, 2, 3, 4, 5].filter(id => id !== comment.userId);
    
    // Randomly add 1-3 likes per comment
    const numLikes = Math.floor(Math.random() * 3) + 1;
    const selectedUsers = otherUsers.sort(() => 0.5 - Math.random()).slice(0, numLikes);
    
    for (const userId of selectedUsers) {
      commentLikes.push({
        commentId: comment.id,
        userId: userId,
      });
    }
  }

  // Create comment likes
  for (const like of commentLikes) {
    try {
      await prisma.commentLikes.create({
        data: like,
      });
    } catch (error) {
      // Skip if like already exists (unique constraint)
      if (error.code !== 'P2002') {
        console.error('Error creating comment like:', error);
      }
    }
  }

  console.log(`Comment Likes seeded successfully! Created ${commentLikes.length} comment likes.`);
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedCommentLikes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error seeding comment likes:', error);
      process.exit(1);
    });
}
