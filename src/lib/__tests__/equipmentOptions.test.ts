import { describe, expect, it, vi } from 'vitest';

const mockedState = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('../supabase', () => ({
  supabase: {
    from: mockedState.fromMock,
  },
}));

import { FALLBACK_EQUIPMENT_OPTIONS, loadEquipmentOptions } from '../equipmentOptions';

describe('loadEquipmentOptions', () => {
  it('returns sorted active labels from Supabase when available', async () => {
    mockedState.selectMock.mockReturnValue({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data: [{ label: 'Kettlebells' }, { label: 'Jump Rope' }],
          error: null,
        }),
      })),
    });
    mockedState.fromMock.mockReturnValue({
      select: mockedState.selectMock,
    });

    const options = await loadEquipmentOptions();

    expect(mockedState.fromMock).toHaveBeenCalledWith('preference_equipment_options');
    expect(options).toEqual(['Kettlebells', 'Jump Rope']);
  });

  it('falls back to defaults when Supabase request fails', async () => {
    mockedState.selectMock.mockReturnValue({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'boom' },
        }),
      })),
    });
    mockedState.fromMock.mockReturnValue({
      select: mockedState.selectMock,
    });

    const options = await loadEquipmentOptions();

    expect(options).toEqual([...FALLBACK_EQUIPMENT_OPTIONS]);
  });
});

