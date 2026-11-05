import multer from 'multer';

// Store files in memory so we can stream them to Cloudinary
const storage = multer.memoryStorage();

const videoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const videoFileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    if (!videoMimes.includes(file.mimetype)) {
      return cb(new Error('Only MP4, WebM, MOV and MKV video files are allowed'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    if (!imageMimes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'), false);
    }
  }
  cb(null, true);
};

const imageFileFilter = (req, file, cb) => {
  if (!imageMimes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'), false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB for videos
  },
});

export const imageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB strict limit for images
  },
});

// Field configs for common upload scenarios
export const videoUploadFields = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

export const avatarUpload = imageUpload.single('avatar');
export const bannerUpload = imageUpload.single('banner');
export const thumbnailUpload = imageUpload.single('thumbnail');
