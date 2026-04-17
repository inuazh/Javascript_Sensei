import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'js_sensei_device_id';

export async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous_' + Date.now().toString(36);
  }
}
