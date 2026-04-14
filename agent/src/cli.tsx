import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { createAgent, type Agent, type Message } from './agent.js';
import { defaultTools } from './tools.js';

// ---------------------------------------------------------------------------
// Agent — provider and model resolved from env at startup
// ---------------------------------------------------------------------------

let agent: Agent;
try {
  agent = createAgent({
    // provider auto-detected: AGENT_PROVIDER env → OPENROUTER_API_KEY → ANTHROPIC_API_KEY
    // model: AGENT_MODEL env → provider default
    instructions: 'You are a helpful assistant. Be concise.',
    tools: defaultTools,
  });
} catch (err) {
  console.error((err instanceof Error ? err.message : String(err)));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={isUser ? 'cyan' : 'green'}>
        {isUser ? '> You' : '< Assistant'}
      </Text>
      <Text wrap="wrap">{message.content}</Text>
    </Box>
  );
}

function StreamingMessage({ text, reasoning }: { text: string; reasoning: string }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {reasoning ? (
        <>
          <Text bold color="magenta">Thinking</Text>
          <Text wrap="wrap" color="gray">{reasoning}</Text>
        </>
      ) : null}
      {text ? (
        <>
          <Text bold color="green">{'< Assistant'}</Text>
          <Text wrap="wrap">{text}</Text>
          <Text color="gray">|</Text>
        </>
      ) : null}
    </Box>
  );
}

function InputField({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  useInput((input, key) => {
    if (disabled) return;
    if (key.return) onSubmit();
    else if (key.backspace || key.delete) onChange(value.slice(0, -1));
    else if (input && !key.ctrl && !key.meta) onChange(value + input);
  });

  return (
    <Box>
      <Text color="yellow">{'> '}</Text>
      <Text>{value}</Text>
      <Text color="gray">{disabled ? ' ...' : '_'}</Text>
    </Box>
  );
}

function App() {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamReasoning, setStreamReasoning] = useState('');

  useInput((_, key) => {
    if (key.escape) exit();
  });

  useEffect(() => {
    const onThinkingStart = () => {
      setIsLoading(true);
      setStreamText('');
      setStreamReasoning('');
    };

    const onDelta = (_delta: string, accumulated: string) => {
      setStreamText(accumulated);
    };

    const onReasoning = (text: string) => {
      setStreamReasoning(text);
    };

    const onMessageAssistant = () => {
      setMessages(agent.getMessages());
      setStreamText('');
      setStreamReasoning('');
      setIsLoading(false);
    };

    const onError = (_err: Error) => {
      setIsLoading(false);
    };

    agent.on('thinking:start', onThinkingStart);
    agent.on('stream:delta', onDelta);
    agent.on('reasoning:update', onReasoning);
    agent.on('message:assistant', onMessageAssistant);
    agent.on('error', onError);

    return () => {
      agent.off('thinking:start', onThinkingStart);
      agent.off('stream:delta', onDelta);
      agent.off('reasoning:update', onReasoning);
      agent.off('message:assistant', onMessageAssistant);
      agent.off('error', onError);
    };
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    await agent.send(text);
  }, [input, isLoading]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">Agent</Text>
        <Text color="gray"> {agent.providerName}/{agent.model}  (Esc to exit)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {isLoading && (
          <StreamingMessage text={streamText} reasoning={streamReasoning} />
        )}
      </Box>

      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <InputField
          value={input}
          onChange={setInput}
          onSubmit={sendMessage}
          disabled={isLoading}
        />
      </Box>
    </Box>
  );
}

render(<App />);
