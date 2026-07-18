import fs from 'fs';
import imagekit from "../configs/imageKit.js";
import Message from '../models/Message.js';
import User from '../models/User.js';

// Send Message
export const sendMessage = async (req, res) => {
    try {
       const userId = req.userId;
       const { to_user_id, text} = req.body;
       const image = req.file;

       if (!to_user_id || (!text?.trim() && !image)) {
          return res.status(400).json({success: false, message: 'Recipient and message content are required'});
       }

       if (to_user_id === userId) {
          return res.status(400).json({success: false, message: 'You cannot message yourself'});
       }

       const [sender, recipient] = await Promise.all([
          User.findById(userId),
          User.findById(to_user_id),
       ]);

       if (!recipient) {
          return res.status(404).json({success: false, message: 'Recipient not found'});
       }

       if (!sender?.connections?.includes(to_user_id)) {
          return res.status(403).json({success: false, message: 'You can only message connections'});
       }

       let media_url = '';
       let message_type = image ? 'image' : 'text';

       if(message_type === 'image'){
          const fileBuffer = fs.readFileSync(image.path);
          const response =  await imagekit.files.upload({
               file: fileBuffer,
               fileName: image.originalname,
          });

          media_url = imagekit.url({
               path: response.filePath,
               transformation: [
                    {quality: 'auto'},
                    {format: 'webp'},
                    {width: '1280'},
               ]
          })
       }

       const message = await Message.create({
          from_user_id: userId,
          to_user_id,
          text: text?.trim() || '',
          message_type,
          media_url
       })

       res.json({ success: true, message });

    } catch (error) {
          console.log(error);
          res.status(500).json({success: false, message: 'Unable to send message' });
    } finally {
          if (req.file?.path && fs.existsSync(req.file.path)) {
               fs.unlinkSync(req.file.path);
          }
    }
}

// Get Chat Messages
export const getChatMessages = async (req, res) => {
     try{
        const currentUserId = req.userId;
        const {userId} = req.params;

        if (!userId) {
           return res.status(400).json({success: false, message: 'User ID is required'});
        }

        const messages = await Message.find({
           $or: [
               {from_user_id: currentUserId, to_user_id: userId},
               {from_user_id: userId, to_user_id: currentUserId },
           ]
        }).sort({createdAt: 1})

        // mark messages as seen
        await Message.updateMany({from_user_id: userId, to_user_id: currentUserId},
           {seen: true})

        res.json({ success: true, messages });

     } catch (error){
          res.status(500).json({ success: false, message: 'Unable to fetch messages' });
     }
}

export const getUserRecentMessages = async (req, res)=> {
     try{
        const userId = req.userId;
        const messages = await Message.find({
          $or: [{to_user_id: userId}, {from_user_id: userId}],
        }).populate('from_user_id to_user_id')
          .sort({ createdAt: -1 });
        
        res.json({ success: true, messages});
     } catch (error) {
          res.status(500).json({ success: false, message: 'Unable to fetch recent messages' });
     }
}
