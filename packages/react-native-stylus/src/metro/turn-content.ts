import path from "node:path";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Rect, TurnRequest } from "../shared/protocol.js";
import type { PickedSource } from "./picked-source.js";

export type TurnContent = Exclude<SDKUserMessage["message"]["content"], string>;

export function turnContent(request: TurnRequest, source: PickedSource | null, projectRoot: string): TurnContent {
  const where = (index: number) => {
    const component = request.components[index];
    return component ? `${path.relative(projectRoot, component.location.file)}:${component.location.line}` : "";
  };
  const locations = request.components.map(
    (component, index) =>
      `- <${component.name}> at ${where(index)}${!request.repair && index === request.selected ? " (picked)" : ""}`,
  );

  const lines = request.repair
    ? [
        request.repair.causedByLastChange
          ? `The app crashed right after your last change, with this error: ${request.repair.message}`
          : `The app is crashing with this error: ${request.repair.message}`,
        "",
        "Where it happened, innermost first:",
        ...locations,
        "",
        request.repair.causedByLastChange
          ? "Find the cause and fix it with the smallest change, keeping what the last change set out to do."
          : "Find the cause and fix it with the smallest change.",
      ]
    : [
        request.text,
        "",
        "Where the picked element comes from, innermost first:",
        ...locations,
        ...(request.frame ? ["", describeFrame(request.frame, request.screenshot)] : []),
      ];

  if (source) lines.push("", `${path.relative(projectRoot, source.file)} as it is now:`, "```", source.numbered, "```");

  const text = lines.join("\n");
  if (!request.screenshot) return [{ type: "text", text }];
  return [
    { type: "text", text },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: request.screenshot.base64 } },
  ];
}

function describeFrame(frame: Rect, screenshot: TurnRequest["screenshot"]) {
  const box = `x ${round(frame.x)}, y ${round(frame.y)}, ${round(frame.width)}×${round(frame.height)}`;
  return screenshot
    ? `On the attached screenshot (${round(screenshot.width)}×${round(screenshot.height)} points) the picked element is at ${box}.`
    : `The picked element is at ${box} points.`;
}

function round(value: number) {
  return Math.round(value);
}
