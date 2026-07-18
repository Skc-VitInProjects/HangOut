import fs from 'fs'
import imagekit from '../configs/imageKit.js'
import Story from '../models/Story.js'
import User from '../models/User.js'
import { inngest } from '../inngest/index.js'

// Add User Story
export const addUserStory = async (req, res) => {
  let mediaPath = null

  try {
    const userId = req.userId
    const {
      content = '',
      media_type = 'text',
      background_color
    } = req.body

    const media = req.file
    let media_url = ''

    const hasMedia =
      media_type === 'image' || media_type === 'video'

    if (hasMedia) {
      if (!media) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an image or video file'
        })
      }

      mediaPath = media.path

      const actualMediaType = media.mimetype.startsWith('image/') ? 'image' : 'video'

      if (actualMediaType !== media_type) {
        return res.status(400).json({
          success: false,
          message: 'Story media type does not match the uploaded file'
        })
      }

      const response = await imagekit.files.upload({
        file: fs.createReadStream(media.path),
        fileName: media.originalname,
        folder: '/stories'
      })

      media_url = response.url
    }

    const story = await Story.create({
      user: userId,
      content,
      media_url,
      media_type,
      background_color
    })

    await inngest.send({
      name: 'app/story.delete',
      data: {
        storyId: story._id.toString()
      }
    })

    return res.status(201).json({
      success: true,
      message: 'Story added successfully',
      story
    })
  } catch (error) {
    console.error('Add story error:', error)

    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to add story'
    })
  } finally {
    if (mediaPath && fs.existsSync(mediaPath)) {
      fs.unlinkSync(mediaPath)
    }
  }
}

// Get User Stories
export const getStories = async (req, res) => {
  try {
    const userId = req.userId

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const userIds = [
      userId,
      ...(user.connections || []),
      ...(user.following || [])
    ]

    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
      user: {
        $in: userIds
      }
    })
      .populate('user')
      .sort({ createdAt: -1 })

    return res.json({
      success: true,
      stories
    })
  } catch (error) {
    console.error('Get stories error:', error)

    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch stories'
    })
  }
}
