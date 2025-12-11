import { PrismaClient } from '@prisma/client';
import { seedActivities } from './activities.seed';
import { seedCategories } from './categories.seed';
import { seedUsers } from './users.seed';
import { seedProfiles } from './profiles.seed';
import { seedMeetings } from './meetings.seed';
import { seedFollowers } from './followers.seed';
import { seedPayments } from './payments.seed';
import { seedMeetingParticipants } from './meeting-participants.seed';
import { seedNotifications } from './notifications.seed';
import { seedPostSections } from './post-sections.seed';
import { seedPostComments } from './post-comments.seed';
import { seedTags } from './tags.seed';
import { seedOTPs } from './otp.seed';
import { seedTypeSettings } from './type-settings.seed';
import { seedHomePageSettings } from './home-page-settings.seed';
import { seedMeetingLikes } from './meeting-likes.seed';
import { seedBadges } from './badges.seed';
import { seedUserBadges } from './user-badges.seed';
import { seedPostMain } from './post-main.seed';
import { seedPostLikes } from './post-likes.seed';
import { seedUserMentions } from './user-mentions.seed';
import { seedCommentLikes } from './comment-likes.seed';
import { seedCommunityRatings } from './community-ratings.seed';
import { seedMeetingReviews } from './meeting-reviews.seed';
import seedGenres from './genres.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Seed in order to respect foreign key constraints
    console.log('1. Seeding Activities...');
    await seedActivities();
    
    console.log('2. Seeding Categories...');
    await seedCategories();
    
    console.log('2.5. Seeding Genres...');
    await seedGenres();
    
    console.log('3. Seeding Users...');
    await seedUsers();
    
    console.log('4. Seeding Profiles...');
    await seedProfiles();
    
    console.log('5. Seeding Meetings...');
    await seedMeetings();
    
    console.log('6. Seeding Followers...');
    await seedFollowers();
    
    console.log('7. Seeding Payments...');
    await seedPayments();
    
    console.log('8. Seeding Meeting Participants...');
    await seedMeetingParticipants();
    
    console.log('9. Seeding Notifications...');
    await seedNotifications();
    
    console.log('11. Seeding Badges...');
    await seedBadges();
    
    console.log('12. Seeding User Badges...');
    await seedUserBadges();
    
    console.log('13. Seeding Main Posts...');
    await seedPostMain();
    
    console.log('14. Seeding Post Sections...');
    await seedPostSections();
    
    console.log('15. Seeding Post Comments...');
    await seedPostComments();
    
    console.log('16. Seeding Tags...');
    await seedTags();
    
    console.log('17. Seeding Post Likes...');
    await seedPostLikes();
    
  console.log('18. Seeding User Mentions...');
  await seedUserMentions();

  console.log('19. Seeding Comment Likes...');
  await seedCommentLikes();

  console.log('20. Seeding Community Ratings...');
  await seedCommunityRatings();
    
    console.log('21. Seeding OTPs...');
    await seedOTPs();
    
    console.log('22. Seeding Type Settings...');
    await seedTypeSettings();
    
    console.log('23. Seeding Home Page Settings...');
    await seedHomePageSettings();
    
    console.log('24. Seeding Meeting Likes...');
    await seedMeetingLikes();
    
    console.log('25. Seeding Meeting Reviews...');
    await seedMeetingReviews();

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
