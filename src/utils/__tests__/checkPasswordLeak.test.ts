import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { checkPasswordLeak } from '@/utils/checkPasswordLeak';
import { supabase } from '@/integrations/supabase/client';

const mockInvoke = vi.mocked(supabase.functions.invoke);

describe('checkPasswordLeak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns leaked=true for a compromised password', async () => {
    mockInvoke.mockResolvedValue({
      data: { leaked: true, count: 37_000 },
      error: null,
    });

    const result = await checkPasswordLeak('password123');
    expect(result.leaked).toBe(true);
    expect(result.count).toBe(37_000);
    expect(mockInvoke).toHaveBeenCalledWith('check-password-leak', {
      body: { password: 'password123' },
    });
  });

  it('returns leaked=false for a safe password', async () => {
    mockInvoke.mockResolvedValue({
      data: { leaked: false, count: 0 },
      error: null,
    });

    const result = await checkPasswordLeak('xK$9!mQ2pL#wR7@vN');
    expect(result.leaked).toBe(false);
    expect(result.count).toBe(0);
  });

  it('fails open on network error', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'));

    const result = await checkPasswordLeak('anything');
    expect(result.leaked).toBe(false);
    expect(result.count).toBe(0);
  });

  it('fails open on edge function error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function error' },
    });

    const result = await checkPasswordLeak('anything');
    expect(result.leaked).toBe(false);
    expect(result.count).toBe(0);
  });
});
