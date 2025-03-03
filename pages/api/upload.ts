import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Buffer } from "buffer";
import dotenv from "dotenv";
import { NextApiRequest, NextApiResponse } from "next";

// Explicitly load .env.local
dotenv.config({ path: ".env.local" });

const bucketName = process.env.AWS_S3_BUCKET_NAME;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;

// Debugging logs to confirm credentials
console.log("🔍 AWS Credentials Check:");
console.log("AWS_S3_BUCKET_NAME:", bucketName);
console.log("AWS_REGION:", region);
console.log("AWS_ACCESS_KEY_ID:", accessKeyId ? "✅ Loaded" : "❌ MISSING");
console.log("AWS_SECRET_ACCESS_KEY:", secretAccessKey ? "✅ Loaded" : "❌ MISSING");

if (!bucketName || !accessKeyId || !secretAccessKey || !region) {
  throw new Error("❌ AWS environment variables are missing. Check your .env.local file.");
}

// Pass credentials explicitly
const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
  },
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    console.warn("⚠️ Invalid request method:", req.method);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { videoData, fileName } = req.body;
    if (!videoData || !fileName) {
      console.error("❌ Missing video data or filename.");
      return res.status(400).json({ error: "Missing videoData or fileName" });
    }

    console.log(`⬆️ Uploading ${fileName} to S3 bucket: ${bucketName}...`);
    const buffer = Buffer.from(videoData, "base64");

    const uploadParams = {
      Bucket: bucketName!,
      Key: `recordings/${fileName}`,
      Body: buffer,
      ContentType: "video/webm",
    };

    await s3.send(new PutObjectCommand(uploadParams));

    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/recordings/${fileName}`;
    console.log("✅ Upload successful! Video URL:", fileUrl);
    res.status(200).json({ message: "Upload successful", url: fileUrl });

  } catch (error) {
    console.error("❌ S3 Upload Error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
