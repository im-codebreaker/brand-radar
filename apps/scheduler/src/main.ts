console.log('Scheduler starting...')

// Job scheduling logic will be implemented later
// This placeholder allows the app to build and run

process.on('SIGTERM', () => {
  console.log('Scheduler shutting down...')
  process.exit(0)
})
