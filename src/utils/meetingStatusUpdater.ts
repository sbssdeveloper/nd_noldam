import { prisma } from './prisma'

/**
 * Updates meeting status from 'approved' to 'completed' for meetings that have ended
 * A meeting is considered ended when: current time > meetingTime + duration (in minutes)
 */
export async function updateCompletedMeetings(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = []
  let updatedCount = 0

  try {
    const now = new Date()
    
    // Find all approved meetings that should be completed
    const meetingsToUpdate = await prisma.meeting.findMany({
      where: {
        status: 'approved',
        // Meeting has ended: current time > meetingTime + duration
        meetingTime: {
          lt: new Date(now.getTime() - 60 * 1000) // At least 1 minute ago to account for duration
        }
      },
      select: {
        id: true,
        meetingTime: true,
        duration: true,
        meetingName: true
      }
    })

    console.log(`Found ${meetingsToUpdate.length} meetings to check for completion`)

    for (const meeting of meetingsToUpdate) {
      try {
        // Calculate when the meeting should end
        const meetingEndTime = new Date(meeting.meetingTime.getTime() + meeting.duration * 60 * 1000)
        
        // If current time is past the meeting end time, mark as completed
        if (now > meetingEndTime) {
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { 
              status: 'completed',
              updatedAt: new Date()
            }
          })
          
          updatedCount++
          console.log(`Updated meeting "${meeting.meetingName}" (ID: ${meeting.id}) to completed status`)
        }
      } catch (error) {
        const errorMsg = `Failed to update meeting ${meeting.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    console.log(`Successfully updated ${updatedCount} meetings to completed status`)
    
  } catch (error) {
    const errorMsg = `Failed to update completed meetings: ${error instanceof Error ? error.message : 'Unknown error'}`
    errors.push(errorMsg)
    console.error(errorMsg)
  }

  return { updated: updatedCount, errors }
}

/**
 * Ensures the persisted status for a meeting reflects its actual state in time.
 * If an approved meeting has already finished, it will be marked as completed.
 *
 * @param meetingId - Meeting identifier
 * @returns 'completed' when an update happened, otherwise 'unchanged'
 */
export async function ensureMeetingStatusUpToDate(meetingId: number): Promise<'unchanged' | 'completed'> {
  if (!Number.isFinite(meetingId)) {
    return 'unchanged'
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      meetingTime: true,
      duration: true,
      status: true
    }
  })

  if (!meeting || meeting.status !== 'approved') {
    return 'unchanged'
  }

  const durationMinutes = Number.isFinite(meeting.duration) ? meeting.duration : 0
  const meetingEndTime = new Date(meeting.meetingTime.getTime() + durationMinutes * 60 * 1000)

  if (new Date() < meetingEndTime) {
    return 'unchanged'
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      status: 'completed',
      updatedAt: new Date()
    }
  })

  return 'completed'
}

/**
 * Gets the current status of a meeting based on its timing
 * This is used for display purposes without updating the database
 */
export function getMeetingDisplayStatus(meetingTime: Date, duration: number, dbStatus: string): string {
  const now = new Date()
  const meetingEndTime = new Date(meetingTime.getTime() + duration * 60 * 1000)
  
  // If meeting has ended and was approved, show as completed
  if (now > meetingEndTime && dbStatus === 'approved') {
    return 'completed'
  }
  
  return dbStatus
}

/**
 * Gets the Korean translation for meeting status
 */
export function getMeetingStatusKorean(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': '초안',
    'pending': '대기중',
    'approved': '승인됨',
    'reject': '거부됨',
    'completed': '완료됨'
  }
  
  return statusMap[status] || status
}
