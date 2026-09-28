import type { SVGProps } from "react";

export type TrafficAssetIconKind =
  | "station"
  | "junction"
  | "corridor"
  | "road-work"
  | "traffic-announcement"
  | "field-report";

interface TrafficAssetIconProps extends SVGProps<SVGSVGElement> {
  kind: TrafficAssetIconKind;
}

export function TrafficAssetIcon({
  kind,
  className,
  ...props
}: TrafficAssetIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {kind === "station" ? <StationGlyph /> : null}
      {kind === "junction" ? <JunctionGlyph /> : null}
      {kind === "corridor" ? <CorridorGlyph /> : null}
      {kind === "road-work" ? <RoadWorkGlyph /> : null}
      {kind === "traffic-announcement" ? <AnnouncementGlyph /> : null}
      {kind === "field-report" ? <FieldReportGlyph /> : null}
    </svg>
  );
}

function CorridorGlyph() {
  return (
    <>
      <circle cx="5" cy="16" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="14" r="2" fill="currentColor" stroke="none" />
      <path d="m6.4 14.6 4.2-5.1M13.7 9.1l3.7 3.8" />
    </>
  );
}

function StationGlyph() {
  return (
    <>
      <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
      <path d="M8.7 8.7a4.7 4.7 0 0 0 0 6.6M15.3 8.7a4.7 4.7 0 0 1 0 6.6" />
      <path d="M6 6a8.5 8.5 0 0 0 0 12M18 6a8.5 8.5 0 0 1 0 12" />
    </>
  );
}

function JunctionGlyph() {
  return (
    <>
      <path d="M12 3v5.2M12 15.8V21M3 12h5.2M15.8 12H21" />
      <path d="M12 8.2 8.2 12 12 15.8 15.8 12 12 8.2Z" fill="currentColor" />
    </>
  );
}

function RoadWorkGlyph() {
  return (
    <>
      <path d="m12 3 9 9-9 9-9-9 9-9Z" />
      <path d="m9.2 15 2.4-5.7 3.2 1.4M10.2 12.6l4.2 1.8" />
    </>
  );
}

function AnnouncementGlyph() {
  return (
    <>
      <path d="M12 3.2 21 20H3L12 3.2Z" />
      <path d="M12 9v5" />
      <path d="M12 17.2h.01" />
    </>
  );
}

function FieldReportGlyph() {
  return (
    <>
      <path d="M5 5.5h14v10H11l-4.5 3v-3H5v-10Z" />
      <path d="M9 9.5h6M9 12.5h4" />
    </>
  );
}
