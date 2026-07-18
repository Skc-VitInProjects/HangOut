import express from "express";
import {
  getChatMessages,
  sendMessage,
  sseController,
} from "../controllers/messageController.js";
import { upload } from "../configs/multer.js";
import { protect } from "../middlewares/auth.js";

const messageRouter = express.Router();

messageRouter.get("/stream", protect, sseController);

messageRouter.get("/:userId", protect, getChatMessages);

messageRouter.post(
  "/send",
  upload.single("image"),
  protect,
  sendMessage
);

export default messageRouter;