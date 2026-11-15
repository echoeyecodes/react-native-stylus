export type NdjsonRequest = {
  done: Promise<void>;
  abort: () => void;
};

/**
 * POSTs JSON and calls `onMessage` for each line of the newline-delimited JSON response as it
 * streams in. Uses XMLHttpRequest because React Native's fetch doesn't expose a streaming body.
 */
export function postNdjson<T>(url: string, body: unknown, onMessage: (message: T) => void): NdjsonRequest {
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
      if (xhr.status !== 200) return reject(new Error(errorMessage(xhr.responseText, xhr.status)));
      flush();
      resolve();
    };
    xhr.onerror = () => reject(new Error("Lost the connection to Metro."));
    xhr.onabort = () => resolve();
  });

  xhr.open("POST", url);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify(body));

  return { done, abort: () => xhr.abort() };
}

function errorMessage(responseText: string, status: number) {
  try {
    return (JSON.parse(responseText) as { message: string }).message;
  } catch {
    return `Metro responded with ${status}.`;
  }
}
