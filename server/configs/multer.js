import multer from "multer";

const storage = multer.diskStorage({});

const imageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storyMimeTypes = new Set([
  ...imageMimeTypes,
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const fileFilter = (allowedTypes) => (req, file, callback) => {
  if (!allowedTypes.has(file.mimetype)) {
    const error = new Error(`Unsupported file type: ${file.mimetype}`);
    error.status = 400;
    return callback(error);
  }

  return callback(null, true);
};

export const uploadImages = multer({
  storage,
  limits: {fileSize: 10 * 1024 * 1024, files: 4},
  fileFilter: fileFilter(imageMimeTypes),
});

export const uploadStoryMedia = multer({
  storage,
  limits: {fileSize: 50 * 1024 * 1024, files: 1},
  fileFilter: fileFilter(storyMimeTypes),
});
