import { createAgent } from './agent.js';
import { defaultTools } from './tools.js';

async function main() {
  let agent;
  try {
    agent = createAgent({
      // provider auto-detected: AGENT_PROVIDER env → OPENROUTER_API_KEY → ANTHROPIC_API_KEY
      // model: AGENT_MODEL env → provider default
      instructions: 'You are a helpful assistant with access to tools.',
      tools: defaultTools,
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  console.log(`Agent ready (${agent.providerName}/${agent.model}). Type your message (Ctrl+C to exit):\n`);

  agent.on('tool:call', (name, args) => console.log(`[tool] ${name}:`, args));
  agent.on('stream:delta', (delta) => process.stdout.write(delta));
  agent.on('reasoning:update', (text) => process.stderr.write(`[thinking] ${text}\n`));
  agent.on('stream:end', () => console.log('\n'));
  agent.on('error', (err) => console.error('Error:', err.message));

  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const prompt = () => {
    rl.question('You: ', async (input) => {
      if (!input.trim()) { prompt(); return; }
      await agent.send(input);
      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
