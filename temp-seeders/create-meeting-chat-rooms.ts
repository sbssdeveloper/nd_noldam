import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to create group chat rooms for existing meetings and add all participants
 * This script:
 * 1. Finds all meetings that don't have a chat room yet
 * 2. Creates a group chat room for each meeting
 * 3. Adds the meeting creator (host) to the chat room
 * 4. Adds all meeting participants to the chat room
 */
export async function createMeetingChatRooms() {
  console.log('🚀 Starting to create chat rooms for existing meetings...\n');

  try {
    // Get all meetings with their participants
    const allMeetings = await (prisma as any).meeting.findMany({
      include: {
        user: {
          select: {
            id: true,
            nickname: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true
              }
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    // Filter meetings that don't have an active group chat room
    const meetings = [];
    for (const meeting of allMeetings) {
      const existingRoom = await (prisma as any).chatRoom.findFirst({
        where: {
          meetingId: meeting.id,
          type: 'group',
          isActive: true
        }
      });

      if (!existingRoom) {
        meetings.push(meeting);
      }
    }

    console.log(`📊 Found ${meetings.length} meetings without chat rooms (out of ${allMeetings.length} total)\n`);

    if (meetings.length === 0) {
      console.log('✅ All meetings already have chat rooms!');
      return;
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const meeting of meetings) {
      try {
        // Check if a chat room already exists (safety check)
        const existingRoom = await (prisma as any).chatRoom.findFirst({
          where: {
            meetingId: meeting.id,
            type: 'group',
            isActive: true
          }
        });

        if (existingRoom) {
          console.log(`⏭️  Skipping meeting ${meeting.id} (${meeting.meetingName}) - chat room already exists`);
          skipped++;
          continue;
        }

        console.log(`\n📝 Processing meeting ${meeting.id}: "${meeting.meetingName}"`);
        console.log(`   Creator: User ${meeting.userId} (${meeting.user.nickname || 'Unknown'})`);
        console.log(`   Participants: ${meeting.participants.length}`);

        // Create group chat room
        const chatRoom = await (prisma as any).chatRoom.create({
          data: {
            type: 'group',
            name: meeting.meetingName,
            avatar: meeting.meetingBackground || null,
            meetingId: meeting.id,
            createdBy: meeting.userId,
            allowParticipantChat: true,
            lastActivity: new Date(),
            isActive: true
          }
        });

        console.log(`   ✅ Created chat room ${chatRoom.id}`);

        // Add meeting creator as host
        const hostParticipant = await (prisma as any).chatParticipant.upsert({
          where: {
            roomId_userId: {
              roomId: chatRoom.id,
              userId: meeting.userId
            }
          },
          create: {
            roomId: chatRoom.id,
            userId: meeting.userId,
            role: 'host',
            joinedAt: new Date(),
            isActive: true
          },
          update: {
            role: 'host',
            isActive: true,
            leftAt: null // Reactivate if they had left
          }
        });

        console.log(`   ✅ Added host (User ${meeting.userId})`);

        // Add all meeting participants to the chat room
        let participantCount = 0;
        for (const meetingParticipant of meeting.participants) {
          try {
            // Skip the host since we already added them
            if (meetingParticipant.userId === meeting.userId) {
              continue;
            }

            await (prisma as any).chatParticipant.upsert({
              where: {
                roomId_userId: {
                  roomId: chatRoom.id,
                  userId: meetingParticipant.userId
                }
              },
              create: {
                roomId: chatRoom.id,
                userId: meetingParticipant.userId,
                role: 'participant',
                joinedAt: meetingParticipant.joinedOn || new Date(),
                isActive: true
              },
              update: {
                role: 'participant',
                isActive: true,
                leftAt: null // Reactivate if they had left
              }
            });

            participantCount++;
          } catch (participantError: any) {
            console.log(`   ⚠️  Failed to add participant User ${meetingParticipant.userId}: ${participantError.message}`);
          }
        }

        console.log(`   ✅ Added ${participantCount} participants to chat room`);
        created++;

      } catch (error: any) {
        console.error(`   ❌ Error processing meeting ${meeting.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created} chat rooms`);
    console.log(`   ⏭️  Skipped: ${skipped} meetings (already have chat rooms)`);
    console.log(`   ❌ Errors: ${errors} meetings`);
    console.log('\n✨ Done!\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createMeetingChatRooms()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

