import React, { useState } from 'react'
import { Image, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

import api from '../api/axios'

const CreatePost = () => {
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [content, setContent] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)

  const user = useSelector((state) => state.user.value)

  const handleSubmit = async () => {
    if (!images.length && !content.trim()) {
      throw new Error('Please add at least one image or text')
    }

    setLoading(true)

    const postType =
      images.length > 0 && content.trim()
        ? 'text_with_image'
        : images.length > 0
          ? 'image'
          : 'text'

    try {
      const token = await getToken()
      const formData = new FormData()

      formData.append('content', content.trim())
      formData.append('post_type', postType)

      images.forEach((image) => {
        formData.append('images', image)
      })

      const { data } = await api.post(
        '/api/post/add',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!data.success) {
        throw new Error(data.message || 'Unable to create post')
      }

      navigate('/')
      return data
    } catch (error) {
      console.error('Create post error:', error)

      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Unable to create post'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (event) => {
    const selectedFiles = Array.from(event.target.files || [])

    setImages((previousImages) => [
      ...previousImages,
      ...selectedFiles
    ])

    event.target.value = ''
  }

  const removeImage = (imageIndex) => {
    setImages((previousImages) =>
      previousImages.filter((_, index) => index !== imageIndex)
    )
  }

  const publishPost = () => {
    toast.promise(handleSubmit(), {
      loading: 'Uploading...',
      success: 'Post added',
      error: (error) => error.message || 'Post not added'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Create Post
          </h1>

          <p className="text-slate-600">
            Share your thoughts with the world
          </p>
        </div>

        <div
          className="max-w-xl bg-white p-4 sm:p-8 sm:pb-3
          rounded-xl shadow-md space-y-4"
        >
          <div className="flex items-center gap-3">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={user?.full_name || 'User profile'}
                className="w-12 h-12 rounded-full shadow object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full bg-slate-200
                animate-pulse"
              />
            )}

            <div>
              <h2 className="font-semibold">
                {user?.full_name || 'Loading user...'}
              </h2>

              {user?.username && (
                <p className="text-sm text-gray-500">
                  @{user.username}
                </p>
              )}
            </div>
          </div>

          <textarea
            className="w-full resize-none max-h-20 mt-4 text-sm
            outline-none placeholder-gray-400"
            placeholder="What's happening?"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {images.map((image, index) => (
                <div
                  key={`${image.name}-${image.lastModified}-${index}`}
                  className="relative group"
                >
                  <img
                    src={URL.createObjectURL(image)}
                    className="h-20 rounded-md object-cover"
                    alt={`Selected upload ${index + 1}`}
                  />

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute hidden group-hover:flex
                    justify-center items-center inset-0 bg-black/40
                    rounded-md cursor-pointer"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            className="flex items-center justify-between pt-3
            border-t border-gray-300"
          >
            <label
              htmlFor="images"
              className="flex items-center gap-2 text-sm text-gray-500
              hover:text-gray-700 transition cursor-pointer"
            >
              <Image className="size-6" />
            </label>

            <input
              type="file"
              id="images"
              accept="image/*"
              hidden
              multiple
              onChange={handleImageChange}
            />

            <button
              type="button"
              disabled={loading}
              onClick={publishPost}
              className="text-sm bg-gradient-to-r from-indigo-500
              to-purple-600 hover:from-indigo-600
              hover:to-purple-700 active:scale-95 transition
              text-white font-medium px-8 py-2 rounded-md
              cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
              disabled:active:scale-100"
            >
              {loading ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatePost