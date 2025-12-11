// import { NextRequest, NextResponse } from 'next/server';
// import { jwtVerify } from 'jose';
// import { prisma } from '@/utils/prisma';

// function errorResponse(message: string, statusCode: number) {
//   return {
//     success: false,
//     reason: message,
//     statusCode
//   };
// }

// export async function GET(request: NextRequest) {
//   try {
//     const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
//     if (!token) {
//       return NextResponse.json(
//         errorResponse('No token provided', 401),
//         { status: 401 }
//       );
//     }

//     const encoder = new TextEncoder();
//     const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
//     const { payload } = await jwtVerify(token, jwtSecretKey);
//     const userId = parseInt(payload.uid as string || payload.userId as string);

//     if (!userId) {
//       return NextResponse.json(
//         errorResponse('Invalid token payload', 401),
//         { status: 401 }
//       );
//     }

//     // Check if user exists
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: { id: true, nickname: true }
//     });

//     if (!user) {
//       return NextResponse.json(
//         errorResponse('User not found', 404),
//         { status: 404 }
//       );
//     }

//     const { searchParams } = new URL(request.url);
//     const type = searchParams.get('type') || 'all';

//     let meetings: any[] = [];

//     try {
//       if (type === 'all') {
//         // Get both joined and created meetings
//         const joinedMeetings = await prisma.meetingParticipant.findMany({
//           where: { 
//             userId,
//             meeting: {
//               // Hide draft meetings from other users
//               OR: [
//                 { status: { not: 'draft' } }, // Show non-draft meetings to everyone
//                 { status: 'draft', userId: userId } // Show user's own drafts
//               ]
//             }
//           },
//           include: {
//             meeting: {
//               include: {
//                 user: {
//                   select: {
//                     id: true,
//                     nickname: true,
//                     profileImage: true
//                   }
//                 },
//                 participants: true
//               }
//             }
//           },
//           orderBy: { joinedOn: 'desc' }
//         });

//         const createdMeetings = await prisma.meeting.findMany({
//           where: { userId },
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 nickname: true,
//                 profileImage: true
//               }
//             },
//             participants: true
//           },
//           orderBy: { createdAt: 'desc' }
//         });

//         meetings = [
//           ...joinedMeetings.map(jm => ({
//             ...jm.meeting,
//             type: 'joined',
//             joinedAt: jm.joinedOn,
//             // Only count confirmed participants (exclude pending payments)
//             currentParticipants: jm.meeting.participants.filter((p: any) => p.paymentStatus === 'confirmed').length
//           })),
//           ...createdMeetings.map(cm => ({
//             ...cm,
//             type: 'created',
//             // Only count confirmed participants (exclude pending payments)
//             currentParticipants: cm.participants.filter((p: any) => p.paymentStatus === 'confirmed').length
//           }))
//         ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

//       } else if (type === 'joined') {
//         const joinedMeetings = await prisma.meetingParticipant.findMany({
//           where: { 
//             userId,
//             meeting: {
//               // Hide draft meetings from other users
//               OR: [
//                 { status: { not: 'draft' } }, // Show non-draft meetings to everyone
//                 { status: 'draft', userId: userId } // Show user's own drafts
//               ]
//             }
//           },
//           include: {
//             meeting: {
//               include: {
//                 user: {
//                   select: {
//                     id: true,
//                     nickname: true,
//                     profileImage: true
//                   }
//                 },
//                 participants: true
//               }
//             }
//           },
//           orderBy: { joinedOn: 'desc' }
//         });

//         meetings = joinedMeetings.map(jm => ({
//           ...jm.meeting,
//           type: 'joined',
//           joinedAt: jm.joinedOn,
//           // Only count confirmed participants (exclude pending payments)
//           currentParticipants: jm.meeting.participants.filter((p: any) => p.paymentStatus === 'confirmed').length
//         }));

//       } else if (type === 'created') {
//         const createdMeetings = await prisma.meeting.findMany({
//           where: { userId },
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 nickname: true,
//                 profileImage: true
//               }
//             },
//             participants: true
//           },
//           orderBy: { createdAt: 'desc' }
//         });

//         meetings = createdMeetings.map(cm => ({
//           ...cm,
//           type: 'created',
//           // Only count confirmed participants (exclude pending payments)
//           currentParticipants: cm.participants.filter((p: any) => p.paymentStatus === 'confirmed').length
//         }));
//       }

//     } catch (queryError) {
//       meetings = [];
//     }

//     return NextResponse.json({
//       success: true,
//       data: {
//         type,
//         meetings,
//         total: meetings.length
//       }
//     });

//   } catch (error) {
//     return NextResponse.json(
//       errorResponse('Internal server error', 500),
//       { status: 500 }
//     );
//   } finally {
//     await prisma.$disconnect();
//   }
// }

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/utils/prisma';

function errorResponse(message: string, statusCode: number) {
  return {
    success: false,
    reason: message,
    statusCode
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        errorResponse('No token provided', 401),
        { status: 401 }
      );
    }

    const encoder = new TextEncoder();
    const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
    const { payload } = await jwtVerify(token, jwtSecretKey);
    const userId = parseInt(payload.uid as string || payload.userId as string);

    if (!userId) {
      return NextResponse.json(
        errorResponse('Invalid token payload', 401),
        { status: 401 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true }
    });

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found', 404),
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    let meetings: any[] = [];

    try {
      if (type === 'all') {
        // Get both joined and created meetings
        // For joined meetings: show only approved (they can't join pending/reject/completed)
        // For created meetings: show all statuses (user can see all their own meetings)
        const joinedMeetings = await prisma.meetingParticipant.findMany({
          where: { 
            userId,
            meeting: {
              // Only show approved meetings they joined
              // (pending/reject/completed meetings can't be joined, and drafts are shown in created)
              status: 'approved'
            }
          },
          include: {
            meeting: {
              include: {
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    profileImage: true
                  }
                },
                participants: true
              }
            }
          },
          orderBy: { joinedOn: 'desc' }
        });

        const createdMeetings = await prisma.meeting.findMany({
          where: { userId },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true
              }
            },
            participants: true
          },
          orderBy: { createdAt: 'desc' }
        });

        meetings = [
          ...joinedMeetings.map(jm => ({
            ...jm.meeting,
            type: 'joined',
            joinedAt: jm.joinedOn,
            currentParticipants: jm.meeting.participants.length
          })),
          ...createdMeetings.map(cm => ({
            ...cm,
            type: 'created',
            currentParticipants: cm.participants.length
          }))
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      } else if (type === 'joined') {
        const joinedMeetings = await prisma.meetingParticipant.findMany({
          where: { 
            userId,
            meeting: {
              // Only show approved meetings they joined
              // (pending/reject/completed meetings can't be joined)
              status: 'approved'
            }
          },
          include: {
            meeting: {
              include: {
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    profileImage: true
                  }
                },
                participants: true
              }
            }
          },
          orderBy: { joinedOn: 'desc' }
        });

        meetings = joinedMeetings.map(jm => ({
          ...jm.meeting,
          type: 'joined',
          joinedAt: jm.joinedOn,
          currentParticipants: jm.meeting.participants.length
        }));

      } else if (type === 'created') {
        const createdMeetings = await prisma.meeting.findMany({
          where: { userId },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true
              }
            },
            participants: true
          },
          orderBy: { createdAt: 'desc' }
        });

        meetings = createdMeetings.map(cm => ({
          ...cm,
          type: 'created',
          currentParticipants: cm.participants.length
        }));
      } else if (type === 'upcoming') {
        // Get upcoming meetings that user joined (meetingTime + duration > now)
        const now = new Date();
        
        // Get all approved meetings the user joined (no date filter in DB, we'll filter after)
        const joinedMeetings = await prisma.meetingParticipant.findMany({
          where: { 
            userId,
            meeting: {
              status: 'approved' // Only approved meetings
              // Note: meetingTime null check is done in JavaScript filter below
            }
          },
          include: {
            meeting: {
              include: {
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    profileImage: true
                  }
                },
                participants: true
              }
            }
          },
          orderBy: { joinedOn: 'desc' }
        });

        // Filter to only show meetings that haven't ended (meetingTime + duration > now)
        meetings = joinedMeetings
          .map(jm => ({
            ...jm.meeting,
            type: 'joined',
            joinedAt: jm.joinedOn,
            currentParticipants: jm.meeting.participants.length
          }))
          .filter((meeting: any) => {
            if (!meeting.meetingTime) return false;
            
            const meetingTime = new Date(meeting.meetingTime);
            if (isNaN(meetingTime.getTime())) return false;
            
            const duration = meeting.duration || 60; // Default 60 minutes
            const meetingEndTime = new Date(meetingTime.getTime() + duration * 60 * 1000);
            
            // Meeting hasn't ended yet
            return meetingEndTime > now;
          })
          .sort((a: any, b: any) => {
            // Sort by meetingTime ascending (soonest first)
            const timeA = new Date(a.meetingTime).getTime();
            const timeB = new Date(b.meetingTime).getTime();
            return timeA - timeB;
          });
      }

    } catch (queryError) {
      meetings = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        type,
        meetings,
        total: meetings.length
      }
    });

  } catch (error) {
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
