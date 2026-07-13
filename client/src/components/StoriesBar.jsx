import React, { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import moment from 'moment'
import toast from 'react-hot-toast'
import { useAuth } from '@clerk/clerk-react'

import StoryModel from './StoryModel'
import StoryViewer from './StoryViewer'
import api from '../api/axios'

const StoriesBar = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [stories, setStories] = useState([])
  const [showModel, setShowModel] = useState(false)
  const [viewStory, setViewStory] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchStories = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return

    try {
      setLoading(true)

      const token = await getToken()

      if (!token) {
        toast.error('Authentication token was not found')
        return
      }

      const { data } = await api.get('/api/story/get', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (data.success) {
        setStories(data.stories || [])
      } else {
        toast.error(data.message || 'Unable to fetch stories')
      }
    } catch (error) {
      console.error('Fetch stories error:', error)

      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to fetch stories'
      )
    } finally {
      setLoading(false)
    }
  }, [getToken, isLoaded, isSignedIn])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return undefined

    const timeoutId = setTimeout(() => {
      fetchStories()
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [fetchStories, isLoaded, isSignedIn])

  return (
    <div
      className="w-screen sm:w-[calc(100vw-240px)] lg:max-w-2xl
      no-scrollbar overflow-x-auto px-4"
    >
      <div className="flex gap-4 pb-5">
        <div
          onClick={() => setShowModel(true)}
          className="rounded-lg shadow-sm min-w-30 max-w-30 max-h-40
          aspect-[3/4] cursor-pointer hover:shadow-lg transition-all
          duration-200 border-2 border-dashed border-indigo-300
          bg-gradient-to-b from-indigo-50 to-white"
        >
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div
              className="size-10 bg-indigo-500 rounded-full flex
              items-center justify-center mb-3"
            >
              <Plus className="w-5 h-5 text-white" />
            </div>

            <p className="text-sm font-medium text-slate-700 text-center">
              Create Story
            </p>
          </div>
        </div>

        {loading && (
          <p className="text-sm text-slate-500 self-center">
            Loading stories...
          </p>
        )}

        {!loading &&
          stories.map((story) => (
            <div
              onClick={() => setViewStory(story)}
              key={story._id}
              className="relative rounded-lg shadow min-w-30 max-w-30
              max-h-40 aspect-[3/4] cursor-pointer hover:shadow-lg
              transition-all duration-200 bg-gradient-to-b
              from-indigo-500 to-purple-600 hover:from-indigo-700
              hover:to-purple-800 active:scale-95 overflow-hidden"
            >
              {story.user?.profile_picture ? (
                <img
                  src={story.user.profile_picture}
                  alt={story.user?.full_name || 'Story creator'}
                  className="absolute size-8 top-3 left-3 z-10
                  rounded-full ring ring-gray-100 shadow"
                />
              ) : (
                <div
                  className="absolute size-8 top-3 left-3 z-10
                  rounded-full bg-slate-200 ring ring-gray-100 shadow"
                />
              )}

              {story.content && (
                <p
                  className="absolute top-18 left-3 z-10 text-white/80
                  text-sm truncate max-w-24"
                >
                  {story.content}
                </p>
              )}

              <p
                className="text-white absolute bottom-1 right-2
                z-10 text-xs"
              >
                {moment(story.createdAt).fromNow()}
              </p>

              {story.media_type !== 'text' && story.media_url && (
                <div
                  className="absolute inset-0 rounded-lg
                  bg-black overflow-hidden"
                >
                  {story.media_type === 'image' ? (
                    <img
                      src={story.media_url}
                      alt="Story"
                      className="h-full w-full object-cover
                      hover:scale-110 transition duration-500
                      opacity-70 hover:opacity-80"
                    />
                  ) : (
                    <video
                      src={story.media_url}
                      className="h-full w-full object-cover
                      hover:scale-110 transition duration-500
                      opacity-70 hover:opacity-80"
                      muted
                      playsInline
                    />
                  )}
                </div>
              )}
            </div>
          ))}
      </div>

      {showModel && (
        <StoryModel
          setShowModel={setShowModel}
          fetchStories={fetchStories}
        />
      )}

      {viewStory && (
        <StoryViewer
          viewStory={viewStory}
          setViewStory={setViewStory}
        />
      )}
    </div>
  )
}

export default StoriesBar