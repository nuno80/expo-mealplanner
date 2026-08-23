import type { ProteinSource, ProteinTracker } from "@/types";

interface Props {
  tracker: ProteinTracker;
}

const SOURCE_LABELS: Record<ProteinSource, string> = {
  legumes: "Legumi",
  fish: "Pesce",
  white_meat: "Carne B.",
  eggs: "Uova",
  dairy: "Latticini",
  red_meat: "Carne R.",
  plant_based: "Vegetale",
  mixed: "Misto",
  none: "Nessuna",
};

const DISPLAY_ORDER: ProteinSource[] = [
  "legumes",
  "fish",
  "white_meat",
  "eggs",
  "dairy",
  "red_meat",
  "plant_based",
  "mixed",
];

export function ProteinTrackerHeatmap({ tracker }: Props) {
  return (
    <div className="protein-tracker">
      {DISPLAY_ORDER.map((source) => {
        const quota = tracker[source];
        let status: "under-min" | "ok" | "at-max" = "ok";

        if (quota.current < quota.min) {
          status = "under-min";
        } else if (quota.current >= quota.max) {
          status = "at-max";
        }

        return (
          <div key={source} className={`protein-item ${status}`}>
            <div className="count">
              {quota.current}/{quota.min}-{quota.max}
            </div>
            <div className="name">{SOURCE_LABELS[source]}</div>
          </div>
        );
      })}
    </div>
  );
}
