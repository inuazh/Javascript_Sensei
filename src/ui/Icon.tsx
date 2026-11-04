// Deep imports keep the other icon fonts out of the bundle.
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Colors } from './theme';

/** Icons that Feather lacks, taken from Material Community Icons. */
const MCI = {
  flame: 'fire',
  star: 'star',
  'star-outline': 'star-outline',
  snowflake: 'snowflake',
  brain: 'brain',
  trophy: 'trophy-outline',
  'code-braces': 'code-braces',
  sword: 'sword',
  owl: 'owl',
  'weather-sunset': 'weather-sunset-up',
  crown: 'crown-outline',
  'flag-checkered': 'flag-checkered',
  wrench: 'wrench-outline',
  bookshelf: 'bookshelf',
  sprout: 'sprout-outline',
  rocket: 'rocket-launch-outline',
  diamond: 'diamond-outline',
  bullseye: 'bullseye-arrow',
  lightning: 'lightning-bolt',
} as const satisfies Record<string, ComponentProps<typeof MaterialCommunityIcons>['name']>;

type FeatherName = ComponentProps<typeof Feather>['name'];
export type IconName = FeatherName | keyof typeof MCI;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/** Line icons. Use these instead of emoji. */
export function Icon({ name, size = 18, color = Colors.textSecondary }: IconProps) {
  if (name in MCI) {
    return (
      <MaterialCommunityIcons name={MCI[name as keyof typeof MCI]} size={size} color={color} />
    );
  }
  return <Feather name={name as FeatherName} size={size} color={color} />;
}
