import imagekit from "../configs/imageKit.js";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import Post from "../models/Post.js"
import fs from 'fs';
import { inngest } from "../inngest/index.js";
import { clerkClient } from "@clerk/express";

const createUserFromClerk = async (userId) => {
     const clerkUser = await clerkClient.users.getUser(userId);
     const email = clerkUser.emailAddresses?.[0]?.emailAddress;

     if (!email) {
          throw new Error("The authenticated Clerk user has no email address");
     }

     const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
     let username = baseUsername;
     let suffix = 0;

     while (await User.exists({ username })) {
          suffix += 1;
          username = `${baseUsername}${suffix}`;
     }

     return User.findByIdAndUpdate(
          userId,
          {
               $setOnInsert: {
                    _id: userId,
                    email,
                    full_name:
                         [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
                         username,
                    profile_picture: clerkUser.imageUrl || "",
                    username,
               },
          },
          { new: true, upsert: true, runValidators: true }
     );
};

// Get user Data using userId
export const getUserData = async (req, res) => {
     try {
          const userId = req.userId;
          const user = (await User.findById(userId)) || (await createUserFromClerk(userId));

          return res.json({ success: true, user });

     } catch (error) {
          console.log(error);
          res.status(500).json({ success: false, message: "Unable to load user data" });
     }
}

// Update User Data
export const updateUserData = async (req, res) => {
     try {
          const userId = req.userId;
          let { username, bio, location, full_name } = req.body;

          const tempUser = await User.findById(userId);

          if (!tempUser) {
               return res.status(404).json({success: false, message: 'User not found'});
          }

          !username && (username = tempUser.username)

          if (tempUser.username !== username) {
               const user = await User.findOne({ username });

               if (user) {
                    //we will not change the username if it is already taken
                    username = tempUser.username;
               }
          }

          const updatedData = {
               username,
               bio,
               location,
               full_name
          }

          const profile = req.files.profile && req.files.profile[0];
          const cover = req.files.cover && req.files.cover[0];

          if (profile) {
               const buffer = fs.readFileSync(profile.path)
               const response = await imagekit.files.upload({
                    file: buffer,
                    fileName: profile.originalname,
               })

               const url = imagekit.url({
                    path: response.filePath,
                    transformation: [
                         { quality: 'auto' },
                         { format: 'webp' },
                         { width: '512' },

                    ]
               })

               updatedData.profile_picture = url;
          }

          if (cover) {
               const buffer = fs.readFileSync(cover.path)
               const response = await imagekit.files.upload({
                    file: buffer,
                    fileName: cover.originalname,
               })

               const url = imagekit.url({
                    path: response.filePath,
                    transformation: [
                         { quality: 'auto' },
                         { format: 'webp' },
                         { width: '1280' },

                    ]
               })

               updatedData.cover_photo = url;
          }

          const user = await User.findByIdAndUpdate(userId, updatedData, { new: true });

          res.json({ success: true, user, message: 'Profile Updated Sucessfully' })

     } catch (error) {
          console.log(error);
          res.status(500).json({ success: false, message: 'Unable to update profile' });
     } finally {
          for (const files of Object.values(req.files || {})) {
               for (const file of files) {
                    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
               }
          }
     }
}

//Find Users using username , email , location, name
export const discoverUsers = async (req, res) => {
     try {
          const userId = req.userId;
          const { input } = req.body;

          if (typeof input !== 'string' || !input.trim()) {
               return res.status(400).json({success: false, message: 'Search input is required'});
          }

          const escapedInput = input.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const searchPattern = new RegExp(escapedInput, 'i');

          const allUsers = await User.find(
               {
                    $or: [
                         { username: searchPattern },
                         { email: searchPattern },
                         { full_name: searchPattern },
                         { location: searchPattern },
                    ]
               }
          )

          const filteredUsers = allUsers.filter(user => user._id.toString() !== userId);

          res.json({ success: true, users: filteredUsers });

     } catch (error) {
          console.log(error);
          res.status(500).json({ success: false, message: 'Unable to discover users' });
     }
}

//Follow User
export const followUser = async (req, res) => {
     try {
          const userId = req.userId;
          const { id } = req.body;

          if (!id || id === userId) {
               return res.status(400).json({success: false, message: 'A different user ID is required'});
          }

          if (!(await User.exists({_id: id}))) {
               return res.status(404).json({success: false, message: 'User not found'});
          }

          await Promise.all([
               User.findByIdAndUpdate(userId, {$addToSet: {following: id}}),
               User.findByIdAndUpdate(id, {$addToSet: {followers: userId}}),
          ]);

          res.json({ success: true, message: 'Now you are following this user' });

     } catch (error) {
          console.log(error);
          res.status(500).json({ success: false, message: 'Unable to follow user' });
     }
}

//Unfollow User
export const unfollowUser = async (req, res) => {
     try {
          const userId = req.userId;
          const { id } = req.body;

          if (!id) return res.status(400).json({success: false, message: 'User ID is required'});

          await Promise.all([
               User.findByIdAndUpdate(userId, {$pull: {following: id}}),
               User.findByIdAndUpdate(id, {$pull: {followers: userId}}),
          ]);

          res.json({ success: true, message: 'You are no longer following this user' });

     } catch (error) {
          console.log(error);
          res.status(500).json({ success: false, message: 'Unable to unfollow user' });
     }
}


//Send Connection Request
export const sendConnectionRequest = async (req, res) => {
     try {
          const userId = req.userId
          const { id } = req.body;

          if (!id || id === userId) {
               return res.status(400).json({success: false, message: 'A different user ID is required'});
          }

          if (!(await User.exists({_id: id}))) {
               return res.status(404).json({success: false, message: 'User not found'});
          }

          //Check if user has sent more than 20 connection requests in the last 24 hours
          const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

          const connectionRequests= await Connection.find({from_user_id: userId,
                 createdAt: {$gt: last24Hours}})

          if(connectionRequests.length >= 20){
               return res.status(429).json({success: false, message: 'Connection request limit reached for the last 24 hours'})
          }
          
          //Check if users are already connected
          const connection = await Connection.findOne({
               $or: [
                    {from_user_id: userId, to_user_id: id},
                    {from_user_id: id, to_user_id: userId}
               ]
          })

          if(!connection){
              const newConnection =  await Connection.create({
                    from_user_id: userId,
                    to_user_id: id
               })
               
               await inngest.send({
                   name: 'app/connection-request',
                   data: {connectionId: newConnection._id}
               })

               return res.json({success: true, message: 'Connection request sent successfully'})

          }else if(connection && connection.status === 'accepted'){
               return res.status(409).json({success: false, message: 'You are already connected with this user'})
          }

          return res.status(409).json({success: false, message: 'Connection request pending'})

     } catch (error) {
         console.log(error);
         res.status(500).json({success: false, message: 'Unable to send connection request'});
     }
}

// Get User Connections

export const getUserConnections = async (req, res) => {
     try {
          const userId = req.userId
          const user = await User.findById(userId).populate('connections followers following')

          if (!user) return res.status(404).json({success: false, message: 'User not found'});
            
          const connections = user.connections
          const followers = user.followers
          const following = user.following

          const pendingConnections = (await Connection.find({to_user_id: userId, status: 'pending'})
          .populate('from_user_id')).map(connection=> connection.from_user_id)

          res.json({success: true, connections, followers, following, pendingConnections})
     } catch (error) {
         console.log(error);
         res.status(500).json({success: false, message: 'Unable to fetch connections'});
     }
}


// Accept Connection Request
export const acceptConnectionRequest = async (req, res) => {
     try {
          const userId = req.userId
          const {id} = req.body;

          const connection = await Connection.findOne({from_user_id: id, to_user_id: userId})

          if(!connection){
             return res.status(404).json({success: false, message: 'Connection request not found'});
          }

          await Promise.all([
               User.findByIdAndUpdate(userId, {$addToSet: {connections: id}}),
               User.findByIdAndUpdate(id, {$addToSet: {connections: userId}}),
          ])

          connection.status = 'accepted';
          await connection.save()

          res.json({success: true, message: 'Connection accepted successfully'});
          

     }catch(error){     
         console.log(error);
         res.status(500).json({success: false, message: 'Unable to accept connection request'});
     }
}


// Get User Profiles
export const getUserProfiles = async(req, res) => {
     try{
        const {profileId} = req.body;
        const profile = await User.findById(profileId)

        if(!profile){
           return res.status(404).json({success: false, message: "Profile not found"});
        }

        const posts = await Post.find({user: profileId}).populate('user')
        res.json({success: true, profile, posts})

     } catch (error){
          console.log(error);
          res.status(500).json({success: false, message: 'Unable to fetch profile'});
     }
}
