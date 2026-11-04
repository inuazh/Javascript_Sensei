import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Button, Screen, Type } from '../src/ui';

/** Unknown deep link or URL: replaces expo-router's English default screen. */
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']}>
      <Text style={Type.h2}>Страница не найдена</Text>
      <Text style={Type.small}>Возможно, ссылка устарела.</Text>
      <Button title="На главную" onPress={() => router.replace('/')} />
    </Screen>
  );
}
