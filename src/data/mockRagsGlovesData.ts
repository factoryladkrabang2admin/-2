export interface RagsGlovesDailyRecord {
  day: number; // 1 to 31
  dateStr?: string;
  discardRagsKg: number; // คัดทิ้ง เศษผ้า
  discardGlovesKg: number; // คัดทิ้ง ถุงมือ
  beforeWashRagsKg: number; // ก่อนซัก เศษผ้า
  beforeWashGlovesKg: number; // ก่อนซัก ถุงมือ
  afterWashRagsKg: number; // หลังซัก เศษผ้า
  afterWashGlovesKg: number; // หลังซัก ถุงมือ
  note?: string;
}

export const INITIAL_RAGS_GLOVES_DATA: RagsGlovesDailyRecord[] = [];
