import imagekit from "../configs/imageKit.js";
import fs from 'fs';
import Post from "../models/Post.js";
import User from "../models/User.js";

// Add Post
export const addPost = async (req, res) => {
     try {
          const userId = req.userId;
          const { content, post_type } = req.body;
          const images = req.files

          let image_urls = []

          if (images.length) {
               image_urls = await Promise.all(
                    images.map(async (image) => {
                         const fileBuffer = fs.readFileSync(image.path)

                         const response = await imagekit.files.upload({
                              file: fileBuffer,
                              fileName: image.originalname,
                              folder: "posts",
                         })

                         const url = imagekit.url({
                              path: response.filePath,
                              transformation: [
                                   { quality: 'auto' },
                                   { format: 'webp' },
                                   { width: '1280' },

                              ]
                         })

                         return url
                    })
               )
          }

        const post = await Post.create({
           user: userId,
           content,
           image_urls,
           post_type
        })

        const populatedPost = await post.populate('user');
        res.status(201).json({success: true, message: "Post created successfully", post: populatedPost});

     } catch (error) {
          console.log(error);
          res.status(500).json({success: false, message: 'Unable to create post'});
     } finally {
          for (const image of req.files || []) {
               if (image.path && fs.existsSync(image.path)) fs.unlinkSync(image.path);
          }
     }
}

// Get Posts
export const getFeedPosts = async (req, res) => {
     try{
         const userId = req.userId
         const user = await User.findById(userId)

         // User connections and followings
         const userIds = [userId, ...user.connections, ...user.following]
         const posts = await Post.find({user: {$in: userIds}}).populate('user')
           .sort({createdAt: -1});

          res.json({ success : true, posts})
     } catch (error){
          console.log(error);
          res.status(500).json({ success: false, message: 'Unable to fetch feed'});
     }
}

//Like Post
export const likePost = async (req, res) => {
     try{
         const userId = req.userId
         const {postId} = req.body;

         const post = await Post.findById(postId)

         if (!post) return res.status(404).json({success: false, message: 'Post not found'});

         if(post.likes_count.includes(userId)){
              post.likes_count = post.likes_count.filter(
                user => user !== userId)

              await post.save();
              res.json({success: true, message: 'Post unliked'});
         }else{

            post.likes_count.push(userId)
            await post.save()

            res.json({success: true, message: 'Post liked'});
         }

     } catch (error){
          console.log(error);
          res.status(500).json({ success: false, message: 'Unable to update post like'});
     }
}
