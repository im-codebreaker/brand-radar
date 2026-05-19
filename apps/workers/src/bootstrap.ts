console.log('Workers starting...')

// Worker registration and startup logic will be implemented later
// This placeholder allows the app to build and run

process.on('SIGTERM', () => {
  console.log('Workers shutting down...')
  process.exit(0)
})
