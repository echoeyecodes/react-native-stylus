import type { IncomingMessage } from "node:http";

/** Screenshots arrive as base64, so the limit leaves room for a full-resolution capture. */
const MAX_BODY_BYTES = 20 * 1024 * 1024;

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
