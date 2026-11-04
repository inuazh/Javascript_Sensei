/**
 * Sharing plain text. Native apps use the system share sheet; on the web the
 * Web Share API is used when the browser has it, otherwise the text is copied
 * to the clipboard. Never throws.
 */
import { Platform, Share } from 'react-native';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

interface WebNavigator {
  share?: (data: { text: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function shareOnWeb(message: string): Promise<ShareResult> {
  const nav = (globalThis as { navigator?: WebNavigator }).navigator;
  if (typeof nav?.share === 'function') {
    try {
      await nav.share({ text: message });
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'cancelled';
      // Not allowed here (e.g. desktop without a share target): fall back to copying.
    }
  }
  if (typeof nav?.clipboard?.writeText === 'function') {
    try {
      await nav.clipboard.writeText(message);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  return 'failed';
}

export async function shareText(message: string): Promise<ShareResult> {
  if (Platform.OS === 'web') return shareOnWeb(message);
  try {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch {
    return 'failed';
  }
}
