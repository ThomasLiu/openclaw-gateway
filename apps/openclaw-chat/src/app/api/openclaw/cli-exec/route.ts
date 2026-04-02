import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { isOpenClawCliExecAction, getOpenClawCliExecArgv } from '@/config/openclaw-cli-actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  if (process.env.OPENCLAW_CLI_EXEC_DISABLED === '1') {
    return NextResponse.json({ error: 'CLI exec disabled' }, { status: 503 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const action: string = body.action?.trim();
    if (!action || !isOpenClawCliExecAction(action)) {
      return NextResponse.json({ error: 'Unknown or disallowed action' }, { status: 400 });
    }

    const argv = getOpenClawCliExecArgv(action, body.params);

    const cliPath = process.env.OPENCLAW_CLI_PATH ?? 'openclaw';

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const child = spawn(cliPath, argv, { shell: false });

        child.stdout?.on('data', (data: Buffer) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ stdout: data.toString() })}\n\n`)
          );
        });

        child.stderr?.on('data', (data: Buffer) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ stderr: data.toString() })}\n\n`)
          );
        });

        child.on('close', (code) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ exitCode: code })}\n\n`));
          controller.close();
        });

        child.on('error', (err) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
          controller.close();
        });

        req.signal.addEventListener('abort', () => {
          child.kill();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
