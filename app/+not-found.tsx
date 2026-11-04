import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Button, Screen, Type } from '../src/ui';

/** Unknown deep link or URL: replaces expo-router's English default screen. */
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']}>
      <Text style={Type.h2}>страница не найдена</Text>
      <Text style={Type.small}>возможно, ссылка устарела</Text>
      <Button title="на главную" onPress={() => router.replace('/')} />
    </Screen>
  );
}
