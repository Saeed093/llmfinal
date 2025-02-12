"use client";

import { ChatMessage } from "@/lib/types";

type LLMMessageProps = {
  message: ChatMessage;
  messageIndex: number;
};

export const LLMMessage = ({ message, messageIndex }: LLMMessageProps) => {
  // return (
  //   <MessageContainer>
  //     <LLMMessageWrapper>
  //       <MessageSenderOrReceiver>Bot:</MessageSenderOrReceiver>
  //       <Text>{message.content}</Text>
  //     </LLMMessageWrapper>
  //     <EmptySpace />
  //   </MessageContainer>
  // );
};
