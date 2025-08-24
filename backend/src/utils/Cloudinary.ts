import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from "node:fs/promises";

// Load from env (ROTATE the keys you pasted publicly)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const uploadOnCloudinary = async (
  localFilePath: string,
  folder = process.env.CLD_FOLDER || "campus-relay"
): Promise<UploadApiResponse | null> => {
  if (!localFilePath) return null;

  try {
    const res = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder,
    });
    // prefer secure_url
    console.log("Uploaded to Cloudinary:", res.secure_url);
    return res;
  } catch (err) {
    // cleanup best-effort
    try {
      await fs.unlink(localFilePath);
    } catch {}
    return null;
  } finally {
    // if you create temp files elsewhere, ensure they’re removed there
  }
};
