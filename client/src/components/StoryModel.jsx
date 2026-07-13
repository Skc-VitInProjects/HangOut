import { useAuth } from '@clerk/clerk-react'
import {
  ArrowLeft,
  Sparkle,
  TextIcon,
  Upload
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/axios'

const StoryModel = ({ setShowModel, fetchStories }) => {
  const bgColors = [
    '#4f46e5',
    '#7c3aed',
    '#e11d48',
    '#db2777',
    '#ca8a04',
    '#0d9488'
  ]

  const [mode, setMode] = useState('text')
  const [background, setBackground] = useState(bgColors[0])
  const [text, setText] = useState('')
  const [media, setMedia] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  const { getToken } = useAuth()

  const MAX_VIDEO_DURATION = 60
  const MAX_VIDEO_SIZE_MB = 50

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl(null)
  }

  const handleMediaUpload = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    clearPreview()

    if (file.type.startsWith('video/')) {
      if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        toast.error(
          `Video file size cannot exceed ${MAX_VIDEO_SIZE_MB} MB.`
        )

        setMedia(null)
        event.target.value = ''
        return
      }

      const temporaryUrl = URL.createObjectURL(file)
      const video = document.createElement('video')

      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(temporaryUrl)

        if (video.duration > MAX_VIDEO_DURATION) {
          toast.error('Video duration cannot exceed 1 minute.')
          setMedia(null)
          setPreviewUrl(null)
          event.target.value = ''
          return
        }

        setMedia(file)
        setPreviewUrl(URL.createObjectURL(file))
        setText('')
        setMode('media')
      }

      video.onerror = () => {
        URL.revokeObjectURL(temporaryUrl)
        toast.error('Unable to read the selected video.')
        setMedia(null)
        event.target.value = ''
      }

      video.src = temporaryUrl
      return
    }

    if (file.type.startsWith('image/')) {
      setMedia(file)
      setPreviewUrl(URL.createObjectURL(file))
      setText('')
      setMode('media')
      return
    }

    toast.error('Please select a valid image or video.')
    event.target.value = ''
  }

  const handleCreateStory = async () => {
    const trimmedText = text.trim()

    const mediaType =
      mode === 'media'
        ? media?.type?.startsWith('image/')
          ? 'image'
          : 'video'
        : 'text'

    if (mediaType === 'text' && !trimmedText) {
      toast.error('Please enter some text')
      return
    }

    if (mode === 'media' && !media) {
      toast.error('Please select an image or video')
      return
    }

    setLoading(true)

    try {
      const token = await getToken()

      if (!token) {
        throw new Error('Authentication token was not found')
      }

      const formData = new FormData()

      formData.append('content', trimmedText)
      formData.append('media_type', mediaType)
      formData.append('background_color', background)

      if (media) {
        formData.append('media', media)
      }

      const { data } = await api.post(
        '/api/story/create',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!data.success) {
        throw new Error(
          data.message || 'Unable to create story'
        )
      }

      toast.success('Story created successfully')

      await fetchStories()
      setShowModel(false)
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to create story'
      )
    } finally {
      setLoading(false)
    }
  }

  const switchToTextMode = () => {
    clearPreview()
    setMode('text')
    setMedia(null)
  }

  return (
    <div
      className="fixed inset-0 z-110 min-h-screen bg-black/80
      backdrop-blur text-white flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowModel(false)}
            className="text-white p-2 cursor-pointer"
          >
            <ArrowLeft />
          </button>

          <h2 className="text-lg font-semibold">
            Create Story
          </h2>

          <span className="w-10" />
        </div>

        <div
          className="rounded-lg h-96 flex items-center
          justify-center relative overflow-hidden"
          style={{ backgroundColor: background }}
        >
          {mode === 'text' && (
            <textarea
              className="bg-transparent text-white w-full h-full
              p-6 text-lg resize-none focus:outline-none"
              placeholder="What's on your mind?"
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
            />
          )}

          {mode === 'media' && previewUrl && (
            media?.type?.startsWith('image/') ? (
              <img
                src={previewUrl}
                alt="Story preview"
                className="object-contain max-h-full max-w-full"
              />
            ) : (
              <video
                src={previewUrl}
                className="object-contain max-h-full max-w-full"
                controls
                playsInline
              />
            )
          )}
        </div>

        <div className="flex mt-4 gap-2">
          {bgColors.map((color) => (
            <button
              type="button"
              key={color}
              aria-label={`Select background ${color}`}
              className="w-6 h-6 rounded-full ring cursor-pointer"
              style={{ backgroundColor: color }}
              onClick={() => setBackground(color)}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={switchToTextMode}
            className={`flex-1 flex items-center justify-center gap-2
            p-2 rounded cursor-pointer ${
              mode === 'text'
                ? 'bg-white text-black'
                : 'bg-zinc-800'
            }`}
          >
            <TextIcon size={18} />
            Text
          </button>

          <label
            className={`flex-1 flex items-center justify-center gap-2
            p-2 rounded cursor-pointer ${
              mode === 'media'
                ? 'bg-white text-black'
                : 'bg-zinc-800'
            }`}
          >
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleMediaUpload}
            />

            <Upload size={18} />
            Photo/Video
          </label>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleCreateStory}
          className="flex items-center justify-center gap-2 text-white
          py-3 mt-4 w-full rounded bg-gradient-to-r
          from-indigo-500 to-purple-600 hover:from-indigo-600
          hover:to-purple-700 active:scale-95 transition
          cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Sparkle size={18} />
          {loading ? 'Creating...' : 'Create Story'}
        </button>
      </div>
    </div>
  )
}

export default StoryModel

