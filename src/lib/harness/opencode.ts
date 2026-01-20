import { createOpencode } from '@opencode-ai/sdk';
import type { Harness, HarnessEvent, HarnessResult, HarnessRunOptions } from './types.js';

/**
 * OpenCode harness using the OpenCode SDK.
 *
 * Wraps the SDK's session API and emits normalized events.
 */
export const opencodeHarness: Harness = {
  name: 'opencode',

  async run(
    prompt: string,
    options: HarnessRunOptions,
    onEvent: (event: HarnessEvent) => void
  ): Promise<HarnessResult> {
    const startTime = Date.now();
    let serverInstance: any = null;
    let client: any = null;
    let session: any = null;

    try {
      // Check if opencode server is required to be running
      if (!process.env.OPENCODE_SERVER_URL && !process.env.OPENCODE_API_KEY) {
        // Start a local opencode server
        onEvent({
          type: 'thinking',
          text: 'Starting OpenCode server...',
        });

        try {
          const opencode = await createOpencode({
            hostname: '127.0.0.1',
            port: 4096,
            timeout: 10000,
          });
          serverInstance = opencode.server;
          client = opencode.client;
        } catch (serverError) {
          const errorMessage = `Failed to start OpenCode server: ${serverError instanceof Error ? serverError.message : String(serverError)}. Set OPENCODE_SERVER_URL to connect to a remote server or ensure opencode is properly configured.`;
          onEvent({ type: 'error', message: errorMessage });
          return {
            success: false,
            durationMs: Date.now() - startTime,
            error: errorMessage,
          };
        }
      } else {
        // Connect to existing server
        const { createOpencodeClient } = await import('@opencode-ai/sdk');
        client = createOpencodeClient({
          baseUrl: process.env.OPENCODE_SERVER_URL || 'http://localhost:4096',
        });
      }

      onEvent({
        type: 'thinking',
        text: 'Creating OpenCode session...',
      });

      // Create a new session
      session = await client.session.create({
        body: {
          title: `Ralphie Session - ${new Date().toISOString()}`,
        },
      });

      onEvent({
        type: 'thinking',
        text: 'Sending prompt to OpenCode...',
      });

      // Initialize the session if needed (analyze project)
      try {
        await client.session.init({
          path: { id: session.id },
        });
      } catch (initError) {
        // Init might fail if already analyzed, continue anyway
        console.debug('Session init failed, continuing:', initError);
      }

      // Subscribe to events for real-time feedback
      const eventStream = await client.event.subscribe();
      
      // Handle events in background
      const eventHandler = async () => {
        try {
          for await (const event of eventStream.stream) {
            // Map OpenCode events to Ralphie events
            switch (event.type) {
              case 'tool_start':
                onEvent({
                  type: 'tool_start',
                  name: event.properties.toolName || 'Unknown',
                  input: event.properties.input ? JSON.stringify(event.properties.input) : undefined,
                });
                break;
              
              case 'tool_end':
                onEvent({
                  type: 'tool_end',
                  name: event.properties.toolName || 'Unknown',
                  output: event.properties.output ? JSON.stringify(event.properties.output) : undefined,
                  error: event.properties.error === true,
                });
                break;
              
              case 'thinking':
                onEvent({
                  type: 'thinking',
                  text: event.properties.text || 'Thinking...',
                });
                break;
              
              case 'message':
                onEvent({
                  type: 'message',
                  text: event.properties.text || '',
                });
                break;
              
              case 'error':
                onEvent({
                  type: 'error',
                  message: event.properties.message || 'Unknown error occurred',
                });
                break;
            }
          }
        } catch (streamError) {
          // Stream might close normally, ignore errors here
          console.debug('Event stream closed:', streamError);
        }
      };

      // Start event handling in background
      const eventPromise = eventHandler();

      // Send the prompt
      const response = await client.session.prompt({
        path: { id: session.id },
        body: {
          model: options.model ? {
            providerID: 'anthropic', // Default to anthropic provider
            modelID: options.model,
          } : undefined,
          parts: [{ type: 'text', text: prompt }],
        },
      });

      // Wait for event processing to complete
      await eventPromise;

      // Get session details for usage information
      const sessionDetails = await client.session.get({
        path: { id: session.id },
      });

      // Collect the final output
      const messages = await client.session.messages({
        path: { id: session.id },
      });

      const lastAssistantMessage = messages
        .filter((msg: any) => msg.info.role === 'assistant')
        .pop();

      const output = lastAssistantMessage?.parts
        ?.filter((part: any) => part.type === 'text')
        ?.map((part: any) => part.text)
        ?.join('\n') || '';

      // Clean up session
      try {
        await client.session.delete({
          path: { id: session.id },
        });
      } catch (cleanupError) {
        console.debug('Failed to cleanup session:', cleanupError);
      }

      // Clean up server if we started it
      if (serverInstance) {
        try {
          serverInstance.close();
        } catch (closeError) {
          console.debug('Failed to close server:', closeError);
        }
      }

      return {
        success: true,
        durationMs: Date.now() - startTime,
        output,
        // OpenCode doesn't provide cost/token info in the same way
        // We could potentially calculate this from session details if available
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onEvent({ type: 'error', message: errorMessage });

      // Cleanup on error
      try {
        if (session && client) {
          await client.session.delete({
            path: { id: session.id },
          });
        }
        if (serverInstance) {
          serverInstance.close();
        }
      } catch (cleanupError) {
        console.debug('Cleanup failed:', cleanupError);
      }

      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: errorMessage,
      };
    }
  },
};