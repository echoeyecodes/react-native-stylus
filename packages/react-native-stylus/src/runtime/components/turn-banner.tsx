import type { ReactNode } from "react";
import { currentStep, replySummary, turnChanges } from "../turn-summary";
import type { Turn } from "../turns";
import { Banner, BannerLead, BannerSpinner, BannerText } from "./banner";
import { ElementThumbnail } from "./element-thumbnail";
import { IconButton } from "./icon-button";
import { LineCounts } from "./line-counts";

type Props = {
  /** Null until the first request starts, such as while a crash fix gets going. */
  turn: Turn | null;
  error: string | null;
  /** Holding Compare shows the app as it was before the turn. */
  comparing: boolean;
  onCompare: (comparing: boolean) => void;
  onOpen: () => void;
  onDismiss: () => void;
  onStop: () => void;
  /** Set when this turn's undo is the one to offer. */
  onUndo: (() => void) | null;
};

/** The latest turn at a glance: what Claude is doing, or what changed and a way back. */
export function TurnBanner({ turn, error, comparing, onCompare, onOpen, onDismiss, onStop, onUndo }: Props) {
  const busy = turn ? turn.status === "running" || turn.status === "checking" : error === null;
  const undo = onUndo && <IconButton icon="undo" label="Undo" onPress={onUndo} />;

  let lead: ReactNode = null;
  let text: ReactNode;
  let actions: ReactNode = null;

  if (!turn) {
    lead = <BannerSpinner />;
    text = error ? (
      <BannerText title="Stylus couldn't start" subtitle={error} tone="danger" />
    ) : (
      <BannerText title="Starting" busy />
    );
  } else {
    const request = turn.origin === "repair" ? "Fixing the crash" : turn.request;
    switch (turn.status) {
      case "running":
      case "checking":
        lead = <BannerSpinner />;
        text = <BannerText title={currentStep(turn)} subtitle={request} busy />;
        if (turn.status === "running") actions = <IconButton icon="stop" label="Stop" onPress={onStop} />;
        break;
      case "done": {
        const changes = turnChanges(turn);
        const edited = changes.files.length > 0;
        if (edited && turn.after && turn.frame) {
          lead = <ElementThumbnail screenshot={turn.after} frame={turn.frame} width={56} height={40} />;
        }
        text = (
          <BannerText
            title={comparing ? "Before this change" : (replySummary(turn) ?? (edited ? "Done" : "No changes"))}
            subtitle={
              edited ? (
                <>
                  {filesLabel(changes.files)} · <LineCounts counts={changes} />
                </>
              ) : (
                request
              )
            }
          />
        );
        actions = (
          <>
            {edited && turn.before && (
              <IconButton
                icon="compare"
                label="Hold to see the app before this change"
                active={comparing}
                onPressIn={() => onCompare(true)}
                onPressOut={() => onCompare(false)}
              />
            )}
            {undo}
          </>
        );
        break;
      }
      case "broken": {
        const device = turn.parts.findLast((part) => part.kind === "device");
        const message = device?.kind === "device" ? device.message : null;
        text = <BannerText title="The app is crashing" subtitle={message ?? request} tone="danger" />;
        actions = undo;
        break;
      }
      case "stopped":
        text = <BannerText title="Stopped" subtitle="Its edits were put back." />;
        break;
      case "undone":
        text = <BannerText title="Undone" subtitle={request} />;
        break;
      case "failed":
        text = <BannerText title="The request failed" subtitle={turn.error ?? request} tone="danger" />;
        break;
    }
    if (error && !busy) text = <BannerText title="Stylus hit a problem" subtitle={error} tone="danger" />;
  }

  return (
    <Banner onPress={onOpen} onDismiss={busy ? null : onDismiss} actions={actions}>
      <BannerLead>{lead}</BannerLead>
      {text}
    </Banner>
  );
}

function filesLabel(files: string[]) {
  const [first] = files;
  return files.length === 1 ? first : `${first} and ${files.length - 1} more`;
}
