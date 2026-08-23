import type { DebugLogEntry } from "@/types";

interface Props {
  entries: DebugLogEntry[];
}

export function DebugLogPanel({ entries }: Props) {
  return (
    <div className="debug-log">
      {entries.map((entry, i) => (
        <div key={i} className={`debug-entry ${entry.type}`}>
          <span style={{ opacity: 0.5 }}>
            [{entry.timestamp.toLocaleTimeString()}]
          </span>{" "}
          {entry.message}
        </div>
      ))}
    </div>
  );
}
