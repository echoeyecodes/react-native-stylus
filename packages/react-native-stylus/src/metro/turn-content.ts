import path from "node:path";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Anchor, NewTurn, Rect, Screenshot, TurnComponent } from "../shared/protocol.js";
import type { PickedSource } from "./picked-source.js";

export type TurnContent = Exclude<SDKUserMessage["message"]["content"], string>;

export type TurnRequest = {
  /** The element the turn's thread is about, or null for the whole app. */
  anchor: Anchor | null;
  turn: NewTurn;
  /** The developer's earlier requests in the same thread, oldest first. */
  earlier: string[];
};

/** The component a turn is about: where the crash happened for a repair, otherwise the picked one. */
export function targetOf(anchor: Anchor | null, turn: NewTurn): TurnComponent | undefined {
  return turn.crash ? turn.crash.components[0] : anchor?.components[anchor.selected];
}

export function turnContent(request: TurnRequest, source: PickedSource | null, projectRoot: string): TurnContent {
  const locate = (component: TurnComponent) =>
    `${path.relative(projectRoot, component.location.file)}:${component.location.line}`;
  const lines = request.turn.crash
    ? repairLines(request.turn.crash, request.turn.repairs !== null, locate)
    : requestLines(request, locate);

  if (source) lines.push("", `${path.relative(projectRoot, source.file)} as it is now:`, "```", source.numbered, "```");

  const text = lines.join("\n");
  const { screenshot } = request.turn;
  if (!screenshot) return [{ type: "text", text }];
  return [
    { type: "text", text },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: screenshot.base64 } },
  ];
}

function repairLines(
  crash: NonNullable<NewTurn["crash"]>,
  causedByLastChange: boolean,
  locate: (component: TurnComponent) => string,
) {
  return [
    causedByLastChange
      ? `The app crashed right after your last change, with this error: ${crash.message}`
      : `The app is crashing with this error: ${crash.message}`,
    ...section(
      "Where it happened, innermost first:",
      crash.components.map((component) => `- <${component.name}> at ${locate(component)}`),
    ),
    "",
    causedByLastChange
      ? "Find the cause and fix it with the smallest change, keeping what the last change set out to do."
      : "Find the cause and fix it with the smallest change.",
  ];
}

function requestLines({ anchor, turn, earlier }: TurnRequest, locate: (component: TurnComponent) => string) {
  const lines = [
    turn.text,
    ...section(
      anchor ? "Earlier requests about this element:" : "Earlier requests about the app:",
      earlier.map((text) => `- ${text}`),
    ),
  ];
  if (!anchor) return lines;
  return [
    ...lines,
    ...section(
      "Where the picked element comes from, innermost first:",
      anchor.components.map(
        (component, index) =>
          `- <${component.name}> at ${locate(component)}${index === anchor.selected ? " (picked)" : ""}`,
      ),
    ),
    "",
    describeFrame(anchor.frame, turn.screenshot),
  ];
}

/** A blank line, the heading and its items, or nothing when there are no items. */
function section(heading: string, items: string[]) {
  return items.length > 0 ? ["", heading, ...items] : [];
}

function describeFrame(frame: Rect, screenshot: Screenshot | null) {
  const box = `x ${round(frame.x)}, y ${round(frame.y)}, ${round(frame.width)}×${round(frame.height)}`;
  return screenshot
    ? `On the attached screenshot (${round(screenshot.width)}×${round(screenshot.height)} points) the picked element is at ${box}.`
    : `The picked element is at ${box} points.`;
}

function round(value: number) {
  return Math.round(value);
}
