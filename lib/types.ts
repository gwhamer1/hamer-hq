export type Category = 'AIL' | 'SPS' | 'TPB' | 'Personal';
export type Owner = 'Gary' | 'Andrea';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (24hr)
  endTime?: string; // HH:MM (24hr)
  category: Category;
  owner?: Owner;
  note?: string;
}

export const CATEGORY_COLORS: Record<Category, string> = {
  AIL: '#3d9fff',
  SPS: '#28c76f',
  TPB: '#ff6b4a',
  Personal: '#a78bfa',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  AIL: 'Adventuring Into Life',
  SPS: 'Sustainable Paving Stones',
  TPB: 'The Pickleball Body',
  Personal: 'Personal',
};
