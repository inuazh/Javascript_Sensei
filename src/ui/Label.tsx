import { Text, type TextStyle } from 'react-native';
import { Type } from './theme';

/** Section label styled as a code comment: `// цель дня`. */
export function Label({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[Type.caption, style]}>{`// ${children}`}</Text>;
}
