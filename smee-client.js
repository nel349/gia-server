import SmeeClient from 'smee-client'

const smee = new SmeeClient({
  source: 'https://smee.io/W3smMl5p3K6fVLqR',
  target: 'http://localhost:3000/api/webhook',
  logger: console
})

smee.start()
