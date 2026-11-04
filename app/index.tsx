import { Redirect } from 'expo-router';
import { useUserStore } from '../src/stores/useUserStore';

export default function Index() {
  const onboarded = useUserStore(s => s.settings.onboarded);
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
