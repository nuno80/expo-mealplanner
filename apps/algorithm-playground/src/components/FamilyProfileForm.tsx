import {
  calculateMacroTargets,
  calculateTargetKcal,
  calculateTDEE,
  DEFAULT_CALORIE_ADJUSTMENTS,
} from "@/lib/tdee";
import type { ActivityLevel, FamilyMember, Goal, Sex } from "@/types";
import { useState } from "react";

interface Props {
  onAdd: (member: FamilyMember) => void;
}

export function FamilyProfileForm({ onAdd }: Props) {
  const [name, setName] = useState("Papà");
  const [sex, setSex] = useState<Sex>("male");
  const [birthYear, setBirthYear] = useState(1990);
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(80);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<Goal>("cut");
  const [snacksEnabled, setSnacksEnabled] = useState(false);

  const calorieAdjustment = DEFAULT_CALORIE_ADJUSTMENTS[goal];
  const { bmr, tdee } = calculateTDEE({
    sex,
    weightKg,
    heightCm,
    birthYear,
    activityLevel,
  });
  const targetKcal = calculateTargetKcal(tdee, calorieAdjustment);
  const macros = calculateMacroTargets(weightKg, goal, targetKcal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const member: FamilyMember = {
      id: crypto.randomUUID(),
      name,
      sex,
      birthYear,
      heightCm,
      weightKg,
      activityLevel,
      goal,
      calorieAdjustment,
      tdee,
      targetKcal,
      snacksEnabled,
    };
    onAdd(member);
    setName(`Membro ${Date.now().toString(36)}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Sesso</label>
          <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Maschio</option>
            <option value="female">Femmina</option>
          </select>
        </div>
        <div className="form-group">
          <label>Anno nascita</label>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(Number(e.target.value))}
            min={1930}
            max={2010}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Altezza (cm)</label>
          <input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(Number(e.target.value))}
            min={100}
            max={230}
          />
        </div>
        <div className="form-group">
          <label>Peso (kg)</label>
          <input
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            min={30}
            max={200}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Livello attività</label>
        <select
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
        >
          <option value="sedentary">Sedentario (1.2)</option>
          <option value="light">Leggero (1.375)</option>
          <option value="moderate">Moderato (1.55)</option>
          <option value="active">Attivo (1.725)</option>
          <option value="very_active">Molto attivo (1.9)</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Obiettivo</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            <option value="cut">Cut (-400 kcal)</option>
            <option value="maintain">Mantenimento</option>
            <option value="bulk">Bulk (+300 kcal)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Snack</label>
          <select
            value={snacksEnabled ? "yes" : "no"}
            onChange={(e) => setSnacksEnabled(e.target.value === "yes")}
          >
            <option value="no">No</option>
            <option value="yes">Sì (2 snack)</option>
          </select>
        </div>
      </div>

      {/* TDEE Result */}
      <div className="tdee-result">
        <div className="tdee-item">
          <div className="value">{bmr}</div>
          <div className="label">BMR</div>
        </div>
        <div className="tdee-item">
          <div className="value">{tdee}</div>
          <div className="label">TDEE</div>
        </div>
        <div className="tdee-item">
          <div className="value" style={{ color: goal === "cut" ? "#e94560" : "#4ade80" }}>
            {targetKcal}
          </div>
          <div className="label">Target</div>
        </div>
        <div className="tdee-item">
          <div className="value">{macros.proteinGrams}g</div>
          <div className="label">Proteine</div>
        </div>
      </div>

      <button type="submit" className="primary" style={{ width: "100%", marginTop: "1rem" }}>
        Aggiungi Profilo
      </button>
    </form>
  );
}
