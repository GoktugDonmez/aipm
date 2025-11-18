import express, { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { RoadmapService } from '../services/roadmapService.js'

const router = express.Router()

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 100, // Max 100 files
  },
})

/**
 * POST /api/generate-roadmap
 * 
 * Accepts:
 * - files: Array of text files (conversations/notes)
 * - query: User's natural language query
 * 
 * Returns:
 * - Structured roadmap JSON following roadmap.schema.json
 */
router.post('/generate-roadmap', upload.array('files'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[]
    const { query } = req.body

    // Validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' })
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' })
    }

    // Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Server configuration error: GEMINI_API_KEY not set' 
      })
    }

    console.log(`📝 Received roadmap request:`)
    console.log(`   Query: "${query}"`)
    console.log(`   Files: ${files.length}`)
    files.forEach(f => console.log(`     - ${f.originalname} (${(f.size / 1024).toFixed(1)} KB)`))

    // Initialize roadmap service
    const roadmapService = new RoadmapService(apiKey)

    // Prepare files for processing
    const processedFiles = files.map(file => ({
      name: file.originalname,
      content: file.buffer,
    }))

    // Generate roadmap
    const roadmap = await roadmapService.generateRoadmap(processedFiles, query)

    // Return the roadmap
    res.json({
      success: true,
      roadmap,
      metadata: {
        query,
        fileCount: files.length,
        timestamp: new Date().toISOString(),
      },
    })

  } catch (error: any) {
    console.error('❌ Error generating roadmap:', error)
    
    // Send appropriate error response
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate roadmap',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

export { router as roadmapRouter }
