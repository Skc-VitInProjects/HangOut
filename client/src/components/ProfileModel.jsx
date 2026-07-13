import React, { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { updateUser } from '../features/user/userSlice'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'

const ProfileModel = ({ setShowEdit , onProfileUpdated}) => {
  const dispatch = useDispatch()
  const { getToken } = useAuth()

  const user = useSelector((state) => state.user.value)

  const [loading, setLoading] = useState(false)

  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    location: user?.location || '',
    profile_picture: null,
    cover_photo: null,
    full_name: user?.full_name || ''
  })

  useEffect(() => {
    if (!user) return

    setEditForm((previousForm) => ({
      ...previousForm,
      username: user.username || '',
      bio: user.bio || '',
      location: user.location || '',
      full_name: user.full_name || ''
    }))
  }, [user])

  const profilePreview = useMemo(() => {
    if (!editForm.profile_picture) return null

    return URL.createObjectURL(editForm.profile_picture)
  }, [editForm.profile_picture])

  const coverPreview = useMemo(() => {
    if (!editForm.cover_photo) return null

    return URL.createObjectURL(editForm.cover_photo)
  }, [editForm.cover_photo])

  useEffect(() => {
    return () => {
      if (profilePreview) {
        URL.revokeObjectURL(profilePreview)
      }

      if (coverPreview) {
        URL.revokeObjectURL(coverPreview)
      }
    }
  }, [profilePreview, coverPreview])

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setEditForm((previousForm) => ({
      ...previousForm,
      [name]: value
    }))
  }

  const handleFileChange = (event, fieldName) => {
    const selectedFile = event.target.files?.[0] || null

    setEditForm((previousForm) => ({
      ...previousForm,
      [fieldName]: selectedFile
    }))
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()

    if (!editForm.full_name.trim()) {
      toast.error('Full name is required')
      return
    }

    if (!editForm.username.trim()) {
      toast.error('Username is required')
      return
    }

    setLoading(true)

    try {
      const token = await getToken()
      const userData = new FormData()

      userData.append('username', editForm.username.trim())
      userData.append('bio', editForm.bio.trim())
      userData.append('location', editForm.location.trim())
      userData.append('full_name', editForm.full_name.trim())

      if (editForm.profile_picture) {
        userData.append('profile', editForm.profile_picture)
      }

      if (editForm.cover_photo) {
        userData.append('cover', editForm.cover_photo)
      }

      const updatedUser = await dispatch(
         updateUser({
         userData,
         token
        })
      ).unwrap()

      onProfileUpdated?.(updatedUser)
      setShowEdit(false)
    } catch (error) {
      toast.error(
        error?.message ||
        error ||
        'Unable to update profile'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  const existingProfilePicture =
    typeof user.profile_picture === 'string' &&
    user.profile_picture.trim()
      ? user.profile_picture
      : null

  const existingCoverPhoto =
    typeof user.cover_photo === 'string' &&
    user.cover_photo.trim()
      ? user.cover_photo
      : null

  return (
    <div
      className="fixed inset-0 z-110 h-screen overflow-y-scroll
      bg-black/50"
    >
      <div className="max-w-2xl sm:py-6 mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Edit Profile
          </h1>

          <form
            className="space-y-4"
            onSubmit={handleSaveProfile}
          >
            {/* Profile Picture */}
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm font-medium text-gray-700">
                Profile Picture
              </p>

              <label
                htmlFor="profile_picture"
                className="cursor-pointer"
              >
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  id="profile_picture"
                  onChange={(event) =>
                    handleFileChange(
                      event,
                      'profile_picture'
                    )
                  }
                />

                <div className="group/profile relative">
                  {profilePreview || existingProfilePicture ? (
                    <img
                      src={
                        profilePreview ||
                        existingProfilePicture
                      }
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full
                      object-cover mt-2"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 rounded-full mt-2
                      bg-slate-200 flex items-center
                      justify-center text-sm text-slate-500"
                    >
                      No photo
                    </div>
                  )}

                  <div
                    className="absolute hidden
                    group-hover/profile:flex inset-0 bg-black/20
                    rounded-full items-center justify-center"
                  >
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                </div>
              </label>
            </div>

            {/* Cover Photo */}
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm font-medium text-gray-700">
                Cover Photo
              </p>

              <label
                htmlFor="cover_photo"
                className="cursor-pointer"
              >
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  id="cover_photo"
                  onChange={(event) =>
                    handleFileChange(
                      event,
                      'cover_photo'
                    )
                  }
                />

                <div className="group/cover relative">
                  {coverPreview || existingCoverPhoto ? (
                    <img
                      src={coverPreview || existingCoverPhoto}
                      alt="Cover preview"
                      className="w-80 h-40 rounded-lg
                      object-cover mt-2"
                    />
                  ) : (
                    <div
                      className="w-80 h-40 rounded-lg mt-2
                      bg-gradient-to-r from-indigo-200
                      via-purple-200 to-pink-200"
                    />
                  )}

                  <div
                    className="absolute hidden
                    group-hover/cover:flex inset-0 bg-black/20
                    rounded-lg items-center justify-center"
                  >
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium
                text-gray-700 mb-1"
              >
                Name
              </label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                value={editForm.full_name}
                onChange={handleInputChange}
                className="w-full p-3 border
                border-gray-200 rounded-lg"
                placeholder="Please enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium
                text-gray-700 mb-1"
              >
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={editForm.username}
                onChange={handleInputChange}
                className="w-full p-3 border
                border-gray-200 rounded-lg"
                placeholder="Please enter a username"
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium
                text-gray-700 mb-1"
              >
                Bio
              </label>

              <textarea
                id="bio"
                name="bio"
                rows={3}
                value={editForm.bio}
                onChange={handleInputChange}
                className="w-full p-3 border
                border-gray-200 rounded-lg"
                placeholder="Please enter a short bio"
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium
                text-gray-700 mb-1"
              >
                Location
              </label>

              <input
                id="location"
                name="location"
                type="text"
                value={editForm.location}
                onChange={handleInputChange}
                className="w-full p-3 border
                border-gray-200 rounded-lg"
                placeholder="Please enter your location"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 border border-gray-300
                rounded-lg text-gray-700 hover:bg-gray-50
                transition-colors cursor-pointer
                disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r
                from-indigo-500 to-purple-600 text-white
                rounded-lg hover:from-indigo-600
                hover:to-purple-700 transition cursor-pointer
                disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfileModel
