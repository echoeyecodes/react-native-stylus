export type NdjsonStream = {
  /** Resolves when the response ends or the stream is closed, and rejects if the connection fails. */
  done: Promise<void>;
  close: () => void;
};

/**
 * GETs a newline-delimited JSON response and calls `onMessage` for each line as it streams in.
 * Uses XMLHttpRequest because React Native's fetch doesn't expose a streaming body.
 */
export function streamNdjson<T>(url: string, onMessage: (message: T) => void): NdjsonStream {
  const xhr = new XMLHttpRequest();
  let read = 0;
  let buffer = "";

  const flush = () => {
    buffer += xhr.responseText.slice(read);
    read = xhr.responseText.length;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onMessage(JSON.parse(line) as T);
  };

  const done = new Promise<void>((resolve, reject) => {
    // React Native only streams progress events when a handler is set before `send`.
    xhr.onprogress = flush;
    xhr.onload = () => {
      if (xhr.status !== 200) return reject(new HttpError(xhr.status, errorMessage(xhr.responseText, xhr.status)));
      flush();
      resolve();
    };
    xhr.onerror = () => reject(new Error("Lost the connection to Metro."));
    xhr.onabort = () => resolve();
  });

  xhr.open("GET", url);
  xhr.send();

  return { done, close: () => xhr.abort() };
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorMessage(responseText: string, status: number) {
  try {
    return (JSON.parse(responseText) as { message: string }).message;
  } catch {
    return `Metro responded with ${status}.`;
  }
}
