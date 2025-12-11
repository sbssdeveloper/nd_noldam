const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testReviewTable() {
  try {
    // Try to query the meeting_reviews table
    const reviews = await prisma.meetingReview.findMany()
    console.log('✅ MeetingReview table exists and is accessible!')
    console.log('Reviews count:', reviews.length)
  } catch (error) {
    console.error('❌ Error accessing MeetingReview table:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testReviewTable()
