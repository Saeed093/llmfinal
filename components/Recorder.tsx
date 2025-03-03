import { useEffect, useRef } from "react";

interface RecorderProps {
  isSessionActive: boolean;
}

const Recorder: React.FC<RecorderProps> = ({ isSessionActive }) => {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (isSessionActive) {
      startRecording();
    } else {
      stopRecordingAndUpload();
    }
  }, [isSessionActive]);

  async function startRecording() {
    try {
      console.log("🔴 Starting recording...");
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: "video/webm" });

      mediaRecorder.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.start();
      console.log("✅ Recording started...");
    } catch (error) {
      console.error("❌ Error starting recording:", error);
    }
  }

  function stopRecordingAndUpload() {
    if (mediaRecorder.current) {
      console.log("🛑 Stopping recording...");
      mediaRecorder.current.onstop = uploadToS3;
      mediaRecorder.current.stop();
    }
  }

  async function uploadToS3() {
    if (recordedChunks.current.length === 0) {
      console.warn("⚠️ No recorded data to upload.");
      return;
    }

    console.log("⬆️ Preparing video for upload...");
    const blob = new Blob(recordedChunks.current, { type: "video/webm" });
    recordedChunks.current = []; // Clear recorded chunks

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64data = reader.result?.toString().split(",")[1];
      if (!base64data) {
        console.error("❌ Failed to process video data.");
        return;
      }

      const fileName = `user-session-${Date.now()}.webm`;
      console.log(`📂 Uploading file: ${fileName} to S3...`);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoData: base64data, fileName }),
        });

        const data = await response.json();
        if (response.ok) {
          console.log("✅ Upload successful! Video URL:", data.url);
        } else {
          console.error("❌ Upload failed:", data.error);
        }
      } catch (error) {
        console.error("❌ Upload error:", error);
      }
    };
  }

  return null; // No UI, as it works based on session state
};

export default Recorder;
