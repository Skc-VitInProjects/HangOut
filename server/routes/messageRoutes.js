import express from "express";
import {
  getChatMessages,
  sendMessage,
} from "../controllers/messageController.js";
import { uploadImages } from "../configs/multer.js";
import { protect } from "../middlewares/auth.js";

const messageRouter = express.Router();

messageRouter.get("/:userId", protect, getChatMessages);

messageRouter.post(
  "/send",
  protect,
  uploadImages.single("image"),
  sendMessage
);

export default messageRouter;
