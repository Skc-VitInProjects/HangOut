import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import moment from 'moment'
import { useAuth, useUser } from '@clerk/clerk-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const RecentMessages = () => {
  const [messages, setMessages] = useState([])

  const { user } = useUser()
  const { getToken } = useAuth()

  const fetchRecentMessages = useCallback(async () => {
    try {
      const token = await getToken()

      const { data } = await api.get(
        '/api/user/recent-messages',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!data.success) {
        throw new Error(
          data.message || 'Unable to fetch recent messages'
        )
      }

      const groupedMessages = (data.messages || []).reduce(
        (accumulator, message) => {
          const senderId = message.from_user_id?._id
          const recipientId = message.to_user_id?._id
          const otherUserId = senderId === user?.id ? recipientId : senderId

          if (!otherUserId) {
            return accumulator
          }

          const existingMessage = accumulator[otherUserId]

          if (
            !existingMessage ||
            new Date(message.createdAt) >
              new Date(existingMessage.createdAt)
          ) {
            accumulator[otherUserId] = message
          }

          return accumulator
        },
        {}
      )

      const sortedMessages = Object.values(
        groupedMessages
      ).sort(
        (firstMessage, secondMessage) =>
          new Date(secondMessage.createdAt) -
          new Date(firstMessage.createdAt)
      )

      setMessages(sortedMessages)
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to fetch recent messages'
      )
    }
  }, [getToken, user?.id])

  useEffect(() => {
    if (!user) return undefined

    const timeoutId = setTimeout(() => {
      fetchRecentMessages()
    }, 0)

    const intervalId = setInterval(() => {
      fetchRecentMessages()
    }, 30000)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [user, fetchRecentMessages])

  return (
    <div
      className="bg-white max-w-xs mt-4 p-4 min-h-20
      rounded-md shadow text-xs text-slate-800"
    >
      <h3 className="font-semibold text-slate-800 mb-4">
        Recent Messages
      </h3>

      <div
        className="flex flex-col max-h-56 overflow-y-scroll
        no-scrollbar"
      >
        {messages.map((message) => {
          const sender =
            message.from_user_id?._id === user?.id
              ? message.to_user_id
              : message.from_user_id

          if (!sender?._id) {
            return null
          }

          return (
            <Link
              to={`/messages/${sender._id}`}
              key={message._id}
              className="flex items-start gap-2 py-2
              hover:bg-slate-100"
            >
              {sender.profile_picture ? (
                <img
                  src={sender.profile_picture}
                  alt={sender.full_name || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full
                  bg-slate-200 shrink-0"
                />
              )}

              <div className="w-full min-w-0">
                <div className="flex justify-between gap-2">
                  <p className="font-medium truncate">
                    {sender.full_name || 'Unknown user'}
                  </p>

                  <p className="text-[10px] text-slate-400 shrink-0">
                    {moment(message.createdAt).fromNow()}
                  </p>
                </div>

                <div className="flex justify-between gap-2">
                  <p className="text-gray-500 truncate">
                    {message.text || 'Media'}
                  </p>

                  {!message.seen && message.to_user_id?._id === user?.id && (
                    <p
                      className="bg-indigo-500 text-white w-4 h-4
                      flex items-center justify-center rounded-full
                      text-[10px] shrink-0"
                    >
                      1
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default RecentMessages
