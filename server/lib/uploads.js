import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(serverDir, "..", "uploads");
export const UPLOAD_PREFIX = "/uploads";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export { MAX_IMAGE_BYTES };
export const MAX_IMAGE_COUNT = 6;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const extension = allowedTypes.get(file.mimetype) || ".jpg";
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

function uploadError(message, code = "INVALID_UPLOAD") {
  const error = new Error(message);
  error.code = code;
  error.status = 422;
  return error;
}

function fileFilter(_req, file, callback) {
  if (!allowedTypes.has(file.mimetype)) {
    return callback(uploadError("Only JPG, PNG, and WebP images are allowed."));
  }
  return callback(null, true);
}

export const productImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGE_COUNT },
}).array("images", MAX_IMAGE_COUNT);

export function publicPathForUpload(filename) {
  return `${UPLOAD_PREFIX}/${filename}`;
}

export async function verifyUploadedImages(files = []) {
  const valid = [];
  try {
    for (const file of files) {
      const handle = await fs.open(file.path, "r");
      const buffer = Buffer.alloc(12);
      try {
        await handle.read(buffer, 0, buffer.length, 0);
      } finally {
        await handle.close();
      }
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const isWebp = buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
      if (!isJpeg && !isPng && !isWebp) {
        throw uploadError("The uploaded file is not a valid JPG, PNG, or WebP image.");
      }
      valid.push(file);
    }
    return valid;
  } catch (error) {
    await removeUploadedFiles(files);
    throw error;
  }
}

export async function removeUploadedFiles(files = []) {
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        if (error.code !== "ENOENT") console.warn("Could not remove upload:", error.message);
      }
    })
  );
}

export async function removeImagePath(imagePath) {
  if (typeof imagePath !== "string" || !imagePath.startsWith(`${UPLOAD_PREFIX}/`)) return;
  const filename = path.basename(imagePath);
  const target = path.resolve(UPLOAD_DIR, filename);
  if (!target.startsWith(`${UPLOAD_DIR}${path.sep}`)) return;
  try {
    await fs.unlink(target);
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Could not remove image:", error.message);
  }
}

export function uploadErrorForMulter(error) {
  if (error?.code === "LIMIT_FILE_SIZE") return uploadError("Each image must be 5 MB or smaller.");
  if (error?.code === "LIMIT_FILE_COUNT") return uploadError("Upload no more than 6 images per product.");
  if (error?.code === "LIMIT_UNEXPECTED_FILE") return uploadError("Use the images field for product photos.");
  return error;
}
