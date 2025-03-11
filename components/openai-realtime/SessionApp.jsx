import { useEffect, useRef, useState } from "react";
import { useGameContext } from "../GameContextProvider";
import SessionControls from "./SessionControls";

export default function SessionApp({ mainStateDispatch }) {
  // Define a fixed system message
  const FIXED_SYSTEM_MESSAGE = `You are a customer service trainer representing the Mandai Wildlife Group. Your role is to coach and guide employees from Singapore Zoo, Bird Park, and Night Safari through a customer service role-play exercise. Start by asking the trainee which scenario they would like to role-play. The available scenarios are:

    Managing Miscommunication or Misunderstandings
    Dealing with an Angry Customer
    Handling a VIP or High-Value Customer
    Handling a Customer Who Wants to Speak to a Manager

Once the trainee selects a scenario, simulate that scenario with realistic customer behavior. Engage the trainee by challenging them to respond effectively, then provide immediate, constructive feedback that highlights both strengths and areas for improvement. Your tone should be supportive, instructive, and aimed at helping the trainee develop effective communication, empathy, and problem-solving skills.`;

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const { currentSoundRef, humanoidRef } = useGameContext();

  useEffect(() => {
    console.log("events changed:", events);
  }, [events]);

  async function startSession() {
    // Get an ephemeral key from the Fastify server
    let tokenResponse;
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    try {
      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "verse",
        }),
      });
      tokenResponse = await response.json();
    } catch (error) {
      console.error("Token generation error:", error);
      return;
    }
    const data = tokenResponse;
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;

    pc.ontrack = (e) => {
      console.log("Received audio track");

      if (!audioElement.current) {
        audioElement.current = document.createElement("audio");
        audioElement.current.autoplay = true;
        document.body.appendChild(audioElement.current); // Ensure it's part of the DOM
      }

      const stream = e.streams[0];
      audioElement.current.srcObject = stream;

      // Log when the audio starts playing
      stream.getAudioTracks().forEach((track) => {
        track.addEventListener("started", () => console.log("Audio track started"));
        track.addEventListener("ended", () => console.log("Audio track ended"));
      });

      audioElement.current.onplay = () => {
        console.log("Audio element started playing.");
      };

      audioElement.current.onended = () => {
        console.log("Audio element playback ended.");
      };
    };

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      humanoidRef.current.talkAnimationEnd();
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model via the data channel
  function sendClientEvent(message) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error("Failed to send message - no data channel available", message);
    }
  }

  // Send a user text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Send a system message to the model
  function sendSystemMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
  }

  // Attach event listeners to the data channel when it is created
  useEffect(() => {
    if (dataChannel) {
      // Listen for server events
      dataChannel.addEventListener("message", (e) => {
        console.log("Session APP: Received server event:", e.data);
        const data = JSON.parse(e.data);
        if (data.type === "output_audio_buffer.started") {
          humanoidRef.current.talkAnimationStart();
        }
        if (data.type === "output_audio_buffer.stopped") {
          humanoidRef.current.talkAnimationEnd();
        }
        console.log("Session App data: ", data);
        setEvents((prev) => [data, ...prev]);
      });

      // When the data channel opens, set the session active,
      // clear previous events, and send the fixed system message.
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
        sendSystemMessage(FIXED_SYSTEM_MESSAGE);
      });
    }
  }, [dataChannel]);

  return (
    <>
      <section className="absolute h-32 left-0 right-0 bottom-0 p-4 bg-red-800 z-10">
        <SessionControls
          startSession={startSession}
          stopSession={stopSession}
          sendClientEvent={sendClientEvent}
          sendTextMessage={sendTextMessage}
          events={events}
          isSessionActive={isSessionActive}
        />
      </section>
    </>
  );
}
