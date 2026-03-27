import { supabase } from './supabase';

export const FALLBACK_EQUIPMENT_OPTIONS = [
  'Doorway Pull-up Bar',
  'Resistance Bands',
  'Dumbbells',
  'Kettlebells',
  'Jump Rope',
  'Yoga Mat',
  'Chair',
  'Countertop',
  'Wall Space',
  'Floor Space',
  'None / Bodyweight Only',
] as const;

export const loadEquipmentOptions = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('preference_equipment_options')
    .select('label')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) {
    return [...FALLBACK_EQUIPMENT_OPTIONS];
  }

  const labels = data
    .map((row) => row.label)
    .filter((label): label is string => typeof label === 'string' && label.trim().length > 0);

  return labels.length > 0 ? labels : [...FALLBACK_EQUIPMENT_OPTIONS];
};

