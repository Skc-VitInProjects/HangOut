import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ImageIcon, SendHorizonal } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'

import api from '../api/axios'
import {
  addMessage,
  fetchMessages,
  resetMessages
} from '../features/messages/messagesSlice'

const ChatBox = () => {
  const { messages } = useSelector((state) => state.messages)
  const connections = useSelector(
    (state) => state.connections.connections
  )

  const { userId } = useParams()
  const { getToken } = useAuth()
  const dispatch = useDispatch()

  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [user, setUser] = useState(null)

  const messagesEndRef = useRef(null)

  const fetchUserMessages = useCallback(async (silent = false) => {
    try {
      const token = await getToken()

      await dispatch(
        fetchMessages({
          token,
          userId
        })
      ).unwrap()
    } catch (error) {
      if (!silent) {
        toast.error(error.message || 'Unable to fetch messages')
      }
    }
  }, [dispatch, getToken, userId])

  const sendMessage = async () => {
    try {
      if (!text.trim() && !image) return

      const token = await getToken()
      const formData = new FormData()

      formData.append('to_user_id', userId)
      formData.append('text', text.trim())

      if (image) {
        formData.append('image', image)
      }

      const { data } = await api.post(
        '/api/message/send',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (data.success) {
        setText('')
        setImage(null)
        dispatch(addMessage(data.message))
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        error.message ||
        'Unable to send message'
      )
    }
  }

  useEffect(() => {
    fetchUserMessages()

    const intervalId = setInterval(() => fetchUserMessages(true), 5000)

    return () => {
      clearInterval(intervalId)
      dispatch(resetMessages())
    }
  }, [fetchUserMessages, dispatch])

  useEffect(() => {
    if (connections.length > 0) {
      const selectedUser = connections.find(
        (connection) => connection._id === userId
      )

      setUser(selectedUser || null)
    }
  }, [connections, userId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages])

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col h-screen">
      <div
        className="flex items-center gap-2 p-2 md:px-10 xl:pl-42
        bg-gradient-to-r from-indigo-50 to-purple-50
        border-b border-gray-300"
      >
        <img
          src={user.profile_picture}
          alt={user.full_name}
          className="size-8 rounded-full"
        />

        <div>
          <p className="font-medium">{user.full_name}</p>

          <p className="text-sm text-gray-500 -mt-1.5">
            @{user.username}
          </p>
        </div>
      </div>

      <div className="p-5 md:px-10 h-full overflow-y-scroll">
        <div className="space-y-4 max-w-4xl mx-auto">
          {[...messages]
            .sort(
              (a, b) =>
                new Date(a.createdAt) -
                new Date(b.createdAt)
            )
            .map((message) => {
              const isReceived =
                message.to_user_id !== user._id

              return (
                <div
                  key={message._id}
                  className={`flex flex-col ${
                    isReceived
                      ? 'items-start'
                      : 'items-end'
                  }`}
                >
                  <div
                    className={`p-2 text-sm max-w-sm bg-white
                    text-slate-700 rounded-lg shadow ${
                      isReceived
                        ? 'rounded-bl-none'
                        : 'rounded-br-none'
                    }`}
                  >
                    {message.message_type === 'image' &&
                      message.media_url && (
                        <img
                          src={message.media_url}
                          className="w-full max-w-sm rounded-lg mb-1"
                          alt="Shared attachment"
                        />
                      )}

                    {message.text && (
                      <p>{message.text}</p>
                    )}
                  </div>
                </div>
              )
            })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="px-4">
        <div
          className="flex items-center gap-3 pl-5 p-1.5
          bg-white w-full max-w-xl mx-auto border
          border-gray-200 shadow rounded-full mb-5"
        >
          <input
            type="text"
            className="flex-1 outline-none text-slate-700"
            placeholder="Type a message..."
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                sendMessage()
              }
            }}
          />

          <label htmlFor="image">
            {image ? (
              <img
                src={URL.createObjectURL(image)}
                alt="Selected attachment"
                className="h-8 rounded"
              />
            ) : (
              <ImageIcon
                className="size-7 text-gray-400 cursor-pointer"
              />
            )}

            <input
              type="file"
              id="image"
              accept="image/*"
              hidden
              onChange={(event) =>
                setImage(event.target.files?.[0] || null)
              }
            />
          </label>

          <button
            type="button"
            onClick={sendMessage}
            className="bg-gradient-to-br from-indigo-500
            to-purple-600 hover:from-indigo-700
            hover:to-purple-800 active:scale-95
            cursor-pointer text-white p-2 rounded-full"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatBox
