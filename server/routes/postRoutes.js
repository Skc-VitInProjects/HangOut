import express from 'express';
import { uploadImages } from '../configs/multer.js';
import { protect } from '../middlewares/auth.js';
import { addPost, getFeedPosts, likePost } from '../controllers/postController.js';

const postRouter = express.Router()

postRouter.post('/add', protect, uploadImages.array('images', 4), addPost)

postRouter.get('/feed', protect, getFeedPosts)

postRouter.post('/like', protect, likePost)

export default postRouter
