
import express, { Request, Response } from 'express'
import { TaggingService } from '../services/taggingService.js'

const router = express.Router()
const taggingService = new TaggingService()

/**
 * POST /api/generate-tags
 * 
 * Accepts:
 * - session: ChatSession metadata
 * - documents: Array of strings (message contents)
 * 
 * Returns:
 * - TagGenerationResult
 */
router.post('/generate-tags', async (req: Request, res: Response) => {
    try {
        const { session, documents } = req.body

        if (!session || !documents || !Array.isArray(documents)) {
            return res.status(400).json({ error: 'Invalid input. session and documents (array) are required.' })
        }

        // Optional: Log request (concise)
        console.log(`🏷️  Generating tags for session: "${session.title}" (${documents.length} docs)`)

        const result = await taggingService.generateTags(session, documents)

        res.json(result)

    } catch (error: any) {
        console.error('❌ Error generating tags:', error)
        res.status(500).json({
            error: error.message || 'Failed to generate tags',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
    }
})

export { router as taggingRouter }
