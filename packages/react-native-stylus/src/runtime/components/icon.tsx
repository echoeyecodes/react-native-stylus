import Svg, { Path, Rect } from "react-native-svg";

// Paths from Lucide; see THIRD_PARTY_NOTICES.md.
const ICONS = {
  "arrow-up": (
    <>
      <Path d="m5 12 7-7 7 7" />
      <Path d="M12 19V5" />
    </>
  ),
  "chevron-down": <Path d="m6 9 6 6 6-6" />,
  compare: (
    <>
      <Rect width="18" height="18" x="3" y="3" rx="2" />
      <Path d="M12 3v18" />
    </>
  ),
  inspect: (
    <>
      <Path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z" />
      <Path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
    </>
  ),
  message: (
    <Path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
  ),
  undo: (
    <>
      <Path d="M9 14 4 9l5-5" />
      <Path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
    </>
  ),
  x: (
    <>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </>
  ),
};

export type IconName = keyof typeof ICONS | "stop";

type Props = {
  name: IconName;
  color: string;
  size?: number;
};

export function Icon({ name, color, size = 18 }: Props) {
  if (name === "stop") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </Svg>
  );
}
