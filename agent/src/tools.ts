import { execSync } from 'node:child_process';
import type { ProviderTool } from './provider.js';

export const timeTool: ProviderTool = {
  name: 'get_current_time',
  description: 'Get the current date and time',
  execute: async ({ timezone }: { timezone?: string }) => {
    return {
      time: new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC' }),
      timezone: timezone || 'UTC',
    };
  },
};

export const calculatorTool: ProviderTool = {
  name: 'calculate',
  description: 'Perform mathematical calculations. Input: { expression: string }',
  execute: async ({ expression }: { expression: string }) => {
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const result = Function(`"use strict"; return (${sanitized})`)();
    return { expression, result };
  },
};

/**
 * gsdTool — runs a GSD skill command via the OpenCode CLI.
 *
 * Requires `opencode` to be on PATH. Any model driving this agent session
 * can invoke GSD workflow skills (e.g. gsd-progress, gsd-plan-phase) as
 * structured tool calls instead of asking the user to run them manually.
 *
 * Usage examples the model can call:
 *   { command: "gsd-progress" }
 *   { command: "gsd-plan-phase" }
 *   { command: "gsd-next" }
 *
 * The leading slash is optional — both "gsd-progress" and "/gsd-progress" work.
 */
export const gsdTool: ProviderTool = {
  name: 'gsd',
  description:
    'Run a GSD (Get Shit Done) workflow command via the OpenCode CLI. ' +
    'Use this to check project progress, plan phases, execute work, manage todos, ' +
    'and run any GSD skill. Requires opencode on PATH. ' +
    'Input: { command: string, args?: string }. ' +
    'Examples: { command: "gsd-progress" }, { command: "gsd-plan-phase", args: "--auto" }',
  execute: async ({ command, args }: { command: string; args?: string }) => {
    // Normalize: strip leading slash if present, then re-add it for opencode CLI
    const normalized = command.replace(/^\/+/, '');
    const fullCommand = args
      ? `opencode /${normalized} ${args}`
      : `opencode /${normalized}`;

    try {
      const output = execSync(fullCommand, {
        timeout: 60_000,
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      return { success: true, output: output.trim() };
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('not found') || err.message.includes('ENOENT')) {
          return {
            success: false,
            output:
              'opencode is not on PATH. Install it or run GSD commands manually in your terminal.',
          };
        }
        const execErr = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
        const combinedOutput = [execErr.stdout, execErr.stderr].filter(Boolean).join('\n').trim();
        return { success: false, output: combinedOutput || err.message };
      }
      return { success: false, output: String(err) };
    }
  },
};

export const defaultTools: ProviderTool[] = [timeTool, calculatorTool, gsdTool];
