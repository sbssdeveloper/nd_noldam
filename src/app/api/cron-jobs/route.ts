import { prisma } from '@/utils/prisma'
import { sendMeetingReminderOneDay, sendMeetingReminderThreeDays } from '@/lib/sms/biztalk'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const startTime = new Date()
  const results = {
    executed: true,
    timestamp: startTime.toISOString(),
    remindersSent: {
      oneDay: 0,
      threeDays: 0
    },
    errors: [] as string[]
  }

  try {
    // Only run during a specific hour window (e.g., 9-10 AM) to ensure it runs once per day
    // This prevents duplicate sends if cron runs multiple times
    const now = new Date()
    const currentHour = now.getHours()
    
    if (currentHour < 9 || currentHour >= 10) {
      console.log(`[Cron] Skipping reminders - outside time window (current hour: ${currentHour})`)
      return new Response(JSON.stringify({
        ...results,
        message: 'Outside time window (9-10 AM)',
        skipped: true
      }), {
        headers: { "Content-Type": "application/json" }
      })
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneDayFromNow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
   //onst fourDaysFromNow = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)

    // Find meetings happening in 1 day and 3 days
    const meetings = await prisma.meeting.findMany({
      where: {
        status: 'approved',
        meetingTime: {
          gte: oneDayFromNow,
          lte: threeDaysFromNow
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                phoneNumber: true,
                nickname: true,
                profile: {
                  select: {
                    fullName: true
                  }
                }
              }
            }
          }
        }
      }
    })

    for (const meeting of meetings) {
      try {
        const meetingDate = new Date(meeting.meetingTime)
        const meetingDay = new Date(
          meetingDate.getFullYear(),
          meetingDate.getMonth(),
          meetingDate.getDate()
        )
        
        const daysUntilMeeting = Math.round((meetingDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

        // Only send if exactly 1 or 3 days before
        if (daysUntilMeeting !== 1 && daysUntilMeeting !== 3) {
          continue
        }

        // Send reminders to all participants (not the host)
        for (const participant of meeting.participants) {
          const user = participant.user
          if (!user?.phoneNumber) continue

          // Check if we've already sent SMS today by checking existing notifications
          const reminderPlace = `sms_reminder_${meeting.id}_${user.id}_${daysUntilMeeting}`
          
          const existingNotification = await prisma.userNotification.findFirst({
            where: {
              userId: user.id,
              relatedId: meeting.id,
              relatedType: 'meeting',
              place: reminderPlace,
              createdAt: {
                gte: new Date(today.getTime())
              }
            }
          })

          // If already sent today, skip
          if (existingNotification) {
            console.log(`[Cron] Skipping - already sent reminder to user ${user.id} for meeting ${meeting.id}`)
            continue
          }

          const userName = user.profile?.fullName || user.nickname || '고객'
          const clubName = meeting.meetingName

          try {
            if (daysUntilMeeting === 1) {
              await sendMeetingReminderOneDay({
                recipientPhone: user.phoneNumber,
                name: userName,
                clubName: clubName,
                meetingId: meeting.id
              })
              results.remindersSent.oneDay++
              
              // Mark as sent by creating a notification record
              await prisma.userNotification.create({
                data: {
                  userId: user.id,
                  notificationType: 'MEETING_PARTICIPANT_REMINDER',
                  notificationDetails: `SMS sent: 1-day reminder for ${clubName}`,
                  place: reminderPlace,
                  relatedId: meeting.id,
                  relatedType: 'meeting',
                  priority: 0,
                  category: 'system'
                }
              })
              
              console.log(`[Cron] Sent 1-day SMS reminder to ${user.phoneNumber} for meeting "${clubName}"`)
            } else if (daysUntilMeeting === 3) {
              await sendMeetingReminderThreeDays({
                recipientPhone: user.phoneNumber,
                name: userName,
                clubName: clubName,
                meetingId: meeting.id
              })
              results.remindersSent.threeDays++
              
              // Mark as sent
              await prisma.userNotification.create({
                data: {
                  userId: user.id,
                  notificationType: 'MEETING_PARTICIPANT_REMINDER',
                  notificationDetails: `SMS sent: 3-day reminder for ${clubName}`,
                  place: reminderPlace,
                  relatedId: meeting.id,
                  relatedType: 'meeting',
                  priority: 0,
                  category: 'system'
                }
              })
              
              console.log(`[Cron] Sent 3-day SMS reminder to ${user.phoneNumber} for meeting "${clubName}"`)
            }
          } catch (smsError: any) {
            const errorMsg = `Failed to send reminder to ${user.phoneNumber} for meeting ${meeting.id}: ${smsError?.message || 'Unknown error'}`
            results.errors.push(errorMsg)
            console.error(`[Cron] ${errorMsg}`)
          }
        }
      } catch (meetingError: any) {
        const errorMsg = `Error processing meeting ${meeting.id}: ${meetingError?.message || 'Unknown error'}`
        results.errors.push(errorMsg)
        console.error(`[Cron] ${errorMsg}`)
      }
    }

    const totalSent = results.remindersSent.oneDay + results.remindersSent.threeDays
    console.log(`[Cron] Completed: Sent ${totalSent} reminder SMS messages (1-day: ${results.remindersSent.oneDay}, 3-day: ${results.remindersSent.threeDays})`)

    return new Response(JSON.stringify({
      ...results,
      message: `Cron executed: ${totalSent} reminders sent`,
      ok: true
    }), {
      headers: { "Content-Type": "application/json" }
    })

  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error'
    results.errors.push(errorMsg)
    console.error(`[Cron] Fatal error:`, errorMsg)
    
  return new Response(JSON.stringify({
      ...results,
      message: `Cron executed with errors: ${errorMsg}`,
      ok: true
  }), {
    headers: { "Content-Type": "application/json" }
    })
  }
}
