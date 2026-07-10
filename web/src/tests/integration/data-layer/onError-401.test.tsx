import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api-client';
import { handleQueryError } from '@/shared/auth-session';

afterEach(() => vi.restoreAllMocks());

function setup(pathname: string) {
  const queryClient = new QueryClient();
  const clear = vi.spyOn(queryClient, 'clear').mockImplementation(() => {});
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  const redirect = vi.fn();
  return { queryClient, clear, invalidate, redirect, deps: { queryClient, redirect, pathname } };
}

const err401 = new ApiError({ code: 'UNAUTHENTICATED', message: 'x', status: 401 });

describe('handleQueryError (onError401)', () => {
  it('401 en query no-me dentro de (app) → limpia cache y redirige (NT-05)', () => {
    const { clear, invalidate, redirect, deps } = setup('/organizer/events');
    handleQueryError(err401, { queryKey: ['events'] }, deps);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(clear).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/login?from=%2Forganizer%2Fevents');
  });

  it('401 en query ["me"] → NO redirige (TS-13, evita loop)', () => {
    const { clear, redirect, deps } = setup('/organizer');
    handleQueryError(err401, { queryKey: ['me'] }, deps);
    expect(clear).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('401 en path público → limpia cache pero NO redirige', () => {
    const { clear, redirect, deps } = setup('/vendors');
    handleQueryError(err401, { queryKey: ['events'] }, deps);
    expect(clear).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('403 → NO redirige (NT-06)', () => {
    const { redirect, deps } = setup('/admin');
    handleQueryError(new ApiError({ code: 'FORBIDDEN', message: 'x', status: 403 }), { queryKey: ['x'] }, deps);
    expect(redirect).not.toHaveBeenCalled();
  });
});
