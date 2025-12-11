export interface InterestMeeting {
    id: number
    meetingName: string
    meetingBackground: string | null
    meetingTime: string
    duration: number
    description: string | null
    roadNameAddress: string
    detailedAddress: string
    categories: string[]
    activities: string[]
    participantCount: number
    maxParticipants: number
    minParticipants: number
    fee: number
    hasFee: boolean
    user: any
  }
  

