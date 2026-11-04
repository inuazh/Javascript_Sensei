import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Goes back, or home when there is nothing to go back to: a screen opened by
 * a deep link or a page reload on the web has no history, and router.back()
 * would do nothing.
 */
export function useGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
}
