/**
 * Confirmation and notice dialogs. Native apps use the system alert; on the
 * web react-native-web's Alert.alert does nothing, so the browser's own
 * confirm/alert dialogs are used instead.
 */
import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
}

export function confirmAction({
  title,
  message,
  confirmText,
  cancelText = 'Отмена',
  onConfirm,
}: ConfirmOptions): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}

export function showNotice(title: string, message: string): void {
  if (Platform.OS === 'web') {
    globalThis.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
