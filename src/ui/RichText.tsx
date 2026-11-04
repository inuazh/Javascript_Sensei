import { StyleSheet, Text, type TextStyle } from 'react-native';
import { Colors, Fonts, alpha } from './theme';

/** Renders text with inline `code` and **bold** markup. */
export function RichText({ text, style }: { text: string; style?: TextStyle }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={[styles.base, style]}>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text key={i} style={styles.code}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { fontSize: 15, lineHeight: 23, color: Colors.textPrimary },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.syntax.number,
    backgroundColor: alpha('#79C0FF', 0.1),
  },
  bold: { fontWeight: '800' },
});
