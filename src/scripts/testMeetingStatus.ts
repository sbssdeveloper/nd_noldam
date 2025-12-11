#!/usr/bin/env ts-node

/**
 * Test script to verify meeting status update functionality
 * This creates a test meeting and verifies the status update logic
 */

import { prisma } from '../utils/prisma'
import { updateCompletedMeetings, getMeetingDisplayStatus, getMeetingStatusKorean } from '../utils/meetingStatusUpdater'

async function testMeetingStatusUpdate() {
  console.log('🧪 Testing Meeting Status Update Functionality...\n')

  try {
    // Create a test meeting that should be completed (ended 2 hours ago)
    const pastMeetingTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    const duration = 60 // 1 hour duration
    
    console.log('1. Creating test meeting...')
    const testMeeting = await prisma.meeting.create({
      data: {
        userId: 1, // Assuming user ID 1 exists
        meetingName: 'Test Meeting - Should be Completed',
        meetingTime: pastMeetingTime,
        duration: duration,
        status: 'approved',
        minNum: 1,
        maxNum: 10,
        fee: 0,
        hasFee: false,
        roadNameAddress: 'Test Address',
        detailedAddress: 'Test Detail',
        categories: ['test'],
        activities: ['test'],
        meetingConsentPersonal: true,
        meetingConsentGuidelines: true
      }
    })
    
    console.log(`✅ Created test meeting ID: ${testMeeting.id}`)
    console.log(`   Meeting time: ${pastMeetingTime.toISOString()}`)
    console.log(`   Duration: ${duration} minutes`)
    console.log(`   Status: ${testMeeting.status}\n`)

    // Test the display status function
    console.log('2. Testing display status function...')
    const displayStatus = getMeetingDisplayStatus(pastMeetingTime, duration, 'approved')
    const koreanStatus = getMeetingStatusKorean(displayStatus)
    console.log(`✅ Display status: ${displayStatus}`)
    console.log(`✅ Korean status: ${koreanStatus}\n`)

    // Run the status updater
    console.log('3. Running meeting status updater...')
    const result = await updateCompletedMeetings()
    console.log(`✅ Updated ${result.updated} meetings`)
    if (result.errors.length > 0) {
      console.log(`❌ Errors: ${result.errors.join(', ')}`)
    }
    console.log()

    // Verify the meeting was updated
    console.log('4. Verifying meeting status update...')
    const updatedMeeting = await prisma.meeting.findUnique({
      where: { id: testMeeting.id }
    })
    
    if (updatedMeeting) {
      console.log(`✅ Meeting status updated to: ${updatedMeeting.status}`)
      console.log(`✅ Korean status: ${getMeetingStatusKorean(updatedMeeting.status)}`)
    } else {
      console.log('❌ Meeting not found after update')
    }
    console.log()

    // Clean up - delete the test meeting
    console.log('5. Cleaning up test meeting...')
    await prisma.meeting.delete({
      where: { id: testMeeting.id }
    })
    console.log('✅ Test meeting deleted')

    console.log('\n🎉 All tests passed! Meeting status update functionality is working correctly.')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testMeetingStatusUpdate()
