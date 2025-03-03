import { useEffect, useRef, useState } from "react";
import { CloudLightning, CloudOff, MessageSquare } from "react-feather";
import styled from "styled-components";
import Button from "./Button";

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
`;

const Input = styled.input`
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 0.5rem;
  flex: 1;
`;

const SessionStoppedContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
`;

const SessionActiveContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  gap: 0.5rem;
`;

function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);

  async function handleStartSession() {
    if (isActivating) return;
    setIsActivating(true);

    try {
      // Request screen sharing with system audio included
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // Ensures system audio capture
      });

      // Start the session with the captured screen stream
      startSession(screenStream);
    } catch (error) {
      console.error("❌ Failed to get screen access:", error);
      setIsActivating(false);
    }
  }

  return (
    <SessionStoppedContainer>
      <Button
        onClick={handleStartSession}
        $isActive={isActivating}
        icon={<CloudLightning height={16} />}
      >
        {isActivating ? "starting session..." : "start session"}
      </Button>
    </SessionStoppedContainer>
  );
}

function SessionActive({ stopSession, sendTextMessage, handleRecordingStop }) {
  const [message, setMessage] = useState("");

  function handleSendClientEvent() {
    sendTextMessage(message);
    setMessage("");
  }

  return (
    <SessionActiveContainer>
      <Input
        onKeyDown={(e) => {
          if (e.key === "Enter" && message.trim()) {
            handleSendClientEvent();
          }
        }}
        type="text"
        placeholder="send a text message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button
        onClick={() => {
          if (message.trim()) {
            handleSendClientEvent();
          }
        }}
        icon={<MessageSquare height={16} />}
      >
        send text
      </Button>
      <Button
        onClick={() => {
          handleRecordingStop(); // Stop recording before disconnecting
          stopSession();
        }}
        icon={<CloudOff height={16} />}
      >
        disconnect
      </Button>
    </SessionActiveContainer>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  sendClientEvent,
  sendTextMessage,
  serverEvents,
  isSessionActive,
}) {
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const screenStreamRef = useRef(null);

  const handleStartSession = (screenStream) => {
    screenStreamRef.current = screenStream;
    startSession(screenStream);
  };

  useEffect(() => {
    if (isSessionActive && screenStreamRef.current) {
      initializeRecording();
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isSessionActive]);

  async function initializeRecording() {
    try {
      if (!screenStreamRef.current) {
        console.error("❌ Screen stream not available.");
        return;
      }

      // Get microphone stream separately
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Extract screen audio if available
      const screenAudioTracks = screenStreamRef.current.getAudioTracks();
      if (screenAudioTracks.length === 0) {
        console.warn("⚠️ System audio not captured. Ensure you select 'Share system audio' when sharing.");
      }

      // Combine all tracks: screen video, screen audio (if available), and microphone
      const combinedStream = new MediaStream([
        ...screenStreamRef.current.getVideoTracks(),
        ...screenAudioTracks,
        ...micStream.getAudioTracks(),
      ]);

      console.log("✅ Access granted, initializing MediaRecorder...");
      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start(1000);
      console.log("✅ Recording has started.");
    } catch (error) {
      console.error("❌ Error starting recording:", error);
    }
  }

  function stopRecordingAndUpload() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      console.log("🛑 Stopping the MediaRecorder...");
      mediaRecorderRef.current.onstop = convertToMp4AndUpload;
      mediaRecorderRef.current.stop();
    } else {
      console.warn("⚠️ No active recorder found or not recording.");
    }
  }

  async function convertToMp4AndUpload() {
    if (recordedChunksRef.current.length === 0) {
      console.warn("⚠️ No recorded data to upload.");
      return;
    }

    console.log("🎥 Converting WebM to MP4...");
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    recordedChunksRef.current = [];

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64data = reader.result?.toString().split(",")[1];
      if (!base64data) {
        console.error("❌ Failed to process video data.");
        return;
      }

      const fileName = `user-session-${Date.now()}.mp4`;
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

  return (
    <Container>
      {isSessionActive ? (
        <SessionActive
          stopSession={stopSession}
          sendTextMessage={sendTextMessage}
          handleRecordingStop={stopRecordingAndUpload}
        />
      ) : (
        <SessionStopped startSession={handleStartSession} />
      )}
    </Container>
  );
}
