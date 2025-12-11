#!/usr/bin/env ts-node

/**
 * Script to update meeting statuses from approved to completed
 * This can be run as a cron job or scheduled task
 * 
 * Usage:
 * - Run manually: npm run update-meeting-status
 * - Add to cron: 0 *5 * * * (every 5 minutes)
 */

import { updateCompletedMeetings } from '../utils/meetingStatusUpdater'

async function main() {
  console.log(`[${new Date().toISOString()}] Starting meeting status update...`)
  
  try {
    const result = await updateCompletedMeetings()
    
    if (result.errors.length > 0) {
      console.error('Errors occurred during update:', result.errors)
    }
    
    console.log(`[${new Date().toISOString()}] Meeting status update completed. Updated: ${result.updated}, Errors: ${result.errors.length}`)
    
    // Exit with error code if there were errors
    if (result.errors.length > 0) {
      process.exit(1)
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Fatal error during meeting status update:`, error)
    process.exit(1)
  }
}

// Run the script
main()
