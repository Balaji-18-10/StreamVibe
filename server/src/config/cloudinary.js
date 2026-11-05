import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - File buffer from multer memoryStorage
 * @param {string} folder - Cloudinary folder path (e.g. 'streamvibe/videos')
 * @param {object} options - Additional Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
export const uploadToCloudinary = (fileBuffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary by public ID.
 * @param {string} publicId
 * @param {string} resourceType - 'image' | 'video' | 'raw'
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export default cloudinary;
