import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { roadmapRouter } from './routes/roadmap.js'
import { taggingRouter } from './routes/tagging.js'

// Load environment variables
// Use override: true to ensure .env file takes precedence over stale shell variables
dotenv.config({ override: true })

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Middleware
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api', roadmapRouter)
app.use('/api', taggingRouter)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Memoria backend server running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`)

  const key = process.env.GEMINI_API_KEY
  const keyStatus = key ? `✓ Set (starts with ${key.substring(0, 8)}...)` : '✗ Missing'
  console.log(`🔑 Gemini API Key: ${keyStatus}`)

  const openAiKey = process.env.OPENAI_API_KEY
  const openAiStatus = openAiKey ? `✓ Set (starts with ${openAiKey.substring(0, 8)}...)` : '✗ Missing'
  console.log(`🔑 OpenAI API Key: ${openAiStatus}`)
})
