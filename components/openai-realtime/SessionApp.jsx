//----------------------------------------------------------------------------------orignal code
// import { useEffect, useRef, useState } from "react";
// import { useGameContext } from "../GameContextProvider";
// import SessionControls from "./SessionControls";
// export default function SessionApp({ mainStateDispatch }) {
//   const [isSessionActive, setIsSessionActive] = useState(false);
//   const [events, setEvents] = useState([]);
//   const [dataChannel, setDataChannel] = useState(null);
//   const peerConnection = useRef(null);
//   const audioElement = useRef(null);
//   const { currentSoundRef, humanoidRef } = useGameContext();

//   useEffect(() => {
//     console.log("events changed:", events);
//   }, [events]);

//   async function startSession() {
//     // Get an ephemeral key from the Fastify server
//     let tokenResponse;
//     
//     try {
//       const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${apiKey}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           model: "gpt-4o-realtime-preview-2024-12-17",
//           voice: "verse",
//         }),
//       });

//       tokenResponse = await response.json();
//     } catch (error) {
//       console.error("Token generation error:", error);
//       res.status(500).json({ error: "Failed to generate token" });
//     }
//     const data = tokenResponse;
//     const EPHEMERAL_KEY = data.client_secret.value;

//     // Create a peer connection
//     const pc = new RTCPeerConnection();

//     // Set up to play remote audio from the model
//     audioElement.current = document.createElement("audio");
//     audioElement.current.autoplay = true;

//     pc.ontrack = (e) => {
//       console.log("Received audio track");

//       if (!audioElement.current) {
//         audioElement.current = document.createElement("audio");
//         audioElement.current.autoplay = true;
//         document.body.appendChild(audioElement.current); // Ensure it's part of the DOM
//       }

//       const stream = e.streams[0];
//       audioElement.current.srcObject = stream;

//       // Log when the audio starts playing
//       stream.getAudioTracks().forEach((track) => {
//         track.addEventListener("started", () => console.log("Audio track started"));
//         track.addEventListener("ended", () => console.log("Audio track ended"));
//       });

//       audioElement.current.onplay = () => {
//         console.log("Audio element started playing.");
//       };

//       audioElement.current.onended = () => {
//         console.log("Audio element playback ended.");
//       };
//     };

//     // Add local audio track for microphone input in the browser
//     const ms = await navigator.mediaDevices.getUserMedia({
//       audio: true,
//     });
//     pc.addTrack(ms.getTracks()[0]);

//     // Set up data channel for sending and receiving events
//     const dc = pc.createDataChannel("oai-events");
//     setDataChannel(dc);

//     // Start the session using the Session Description Protocol (SDP)
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);

//     const baseUrl = "https://api.openai.com/v1/realtime";
//     const model = "gpt-4o-realtime-preview-2024-12-17";
//     const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
//       method: "POST",
//       body: offer.sdp,
//       headers: {
//         Authorization: `Bearer ${EPHEMERAL_KEY}`,
//         "Content-Type": "application/sdp",
//       },
//     });

//     const answer = {
//       type: "answer",
//       sdp: await sdpResponse.text(),
//     };
//     await pc.setRemoteDescription(answer);

//     peerConnection.current = pc;
//   }

//   // Stop current session, clean up peer connection and data channel
//   function stopSession() {
//     if (dataChannel) {
//       humanoidRef.current.talkAnimationEnd();
//       dataChannel.close();
//     }

//     peerConnection.current.getSenders().forEach((sender) => {
//       if (sender.track) {
//         sender.track.stop();
//       }
//     });

//     if (peerConnection.current) {
//       peerConnection.current.close();
//     }

//     setIsSessionActive(false);
//     setDataChannel(null);
//     peerConnection.current = null;
//   }

// //  Send a message to the model
//   function sendClientEvent(message) {
//     if (dataChannel) {
//       message.event_id = message.event_id || crypto.randomUUID();
//       dataChannel.send(JSON.stringify(message));
//       setEvents((prev) => [message, ...prev]);
//     } else {
//       console.error("Failed to send message - no data channel available", message);
//     }
//   }



//   // Send a text message to the model
//   function sendTextMessage(message) {
//     const event = {
//       type: "conversation.item.create",
//       item: {
//         type: "message",
//         role: "user",
//         content: [
//           {
//             type: "input_text",
//             text: message,
//           },
//         ],
//       },
//     };

//     sendClientEvent(event);
//     sendClientEvent({ type: "response.create" });
//   }

// //  Attach event listeners to the data channel when a new one is created
//   useEffect(() => {
//     if (dataChannel) {
//       // Append new server events to the list
//       dataChannel.addEventListener("message", (e) => {
//         console.log("Session APP: Received server event:", e.data);
//         const data = JSON.parse(e.data);
//         if (data.type === "output_audio_buffer.started") {
//           humanoidRef.current.talkAnimationStart();
//         }
//         if (data.type === "output_audio_buffer.stopped") {
//           humanoidRef.current.talkAnimationEnd();
//         }
//         console.log("Session App data: ", data);
//         setEvents((prev) => [JSON.parse(e.data), ...prev]);
//       });

//       // Set session active when the data channel is opened
//       dataChannel.addEventListener("open", () => {
//         setIsSessionActive(true);
//         setEvents([]);
//       });
//     }
//   }, [dataChannel]);

//   const [avatarText, setAvatarText] = useState(""); // Stores live transcription text





//   return (
//     <>
//       <section className="absolute h-32 left-0 right-0 bottom-0 p-4 bg-red-800 z-10">
//         <SessionControls
//           startSession={startSession}
//           stopSession={stopSession}
//           sendClientEvent={sendClientEvent}
//           sendTextMessage={sendTextMessage}
//           events={events}
//           isSessionActive={isSessionActive}
//         />
//       </section>
//     </>
//   );
// }




//-------------------------------------------------------------------------------------single msg displayed
import { useEffect, useRef, useState } from "react";
import { useGameContext } from "../GameContextProvider";
import SessionControls from "./SessionControls";

export default function SessionApp({ mainStateDispatch }) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const { currentSoundRef, humanoidRef } = useGameContext();

  // ✅ State to store live transcription
  const [avatarText, setAvatarText] = useState("");

  useEffect(() => {
    console.log("events changed:", events);
  }, [events]);


  async function startSession() {
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
      console.log("API Response:", tokenResponse); // ✅ Debugging

      if (!tokenResponse.client_secret) {
        throw new Error("API response does not contain `client_secret`. Check API key or endpoint.");
      }

    } catch (error) {
      console.error("Token generation error:", error);
      return; // Exit the function early if an error occurs
    }

    const data = tokenResponse;
    const EPHEMERAL_KEY = data.client_secret.value;  // ✅ Now safe to access

    // ✅ Create WebRTC Peer Connection
    const pc = new RTCPeerConnection();

    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;

    pc.ontrack = (e) => {
      console.log("Received audio track");
      const stream = e.streams[0];
      audioElement.current.srcObject = stream;
    };

    // ✅ Capture microphone input
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(ms.getTracks()[0]);

    // ✅ Create a Data Channel
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // ✅ Create an SDP Offer before using it
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";

    // ✅ Send the SDP offer to OpenAI
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,  // ✅ Now `offer` is correctly defined
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = { type: "answer", sdp: await sdpResponse.text() };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }


  function sendClientEvent(message) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error("Failed to send message - no data channel available", message);
    }
  }

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




  // ✅ Define the missing `stopSession` function
  function stopSession() {
    if (dataChannel) {
      humanoidRef.current.talkAnimationEnd(); // Stop animation
      dataChannel.close();
    }

    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    setAvatarText(""); // ✅ Clear transcription when stopping session
  }

  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("message", (e) => {
        console.log("Session APP: Received server event:", e.data);
        const data = JSON.parse(e.data);

        // ✅ Accumulate transcription deltas instead of replacing
        if (data.type === "response.audio_transcript.delta") {
          setAvatarText(prevText => prevText + (data.delta || ""));
        }

        if (data.type === "output_audio_buffer.started") {
          humanoidRef.current.talkAnimationStart();
        }

        if (data.type === "output_audio_buffer.stopped") {
          humanoidRef.current.talkAnimationEnd();
          setTimeout(() => setAvatarText(""), 2000); // ✅ Clear text after 2 seconds
        }

        setEvents((prev) => [data, ...prev]);
      });

      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  useEffect(() => {
    if (dataChannel) {
      // ✅ Your existing event listeners here...
    }
  }, [dataChannel, humanoidRef]);  // ✅ Add humanoidRef



  return (
    <>
      <section className="absolute h-32 left-0 right-0 bottom-0 p-4 bg-red-800 z-10">

        {/* ✅ Show accumulated transcription while avatar is speaking */}
        {avatarText && (
          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-36 p-4 bg-gray-800 text-white rounded-lg shadow-lg text-center w-3/4">
            <p>{avatarText}</p>
          </div>
        )}

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