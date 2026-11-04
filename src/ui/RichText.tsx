import { StyleSheet, Text, type TextStyle } from 'react-native';
import { Colors, Fonts } from './theme';

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
  base: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 23, color: Colors.textPrimary },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 13.5,
    color: Colors.syntax.string,
    backgroundColor: Colors.surfaceRaised,
  },
  bold: { fontFamily: Fonts.sansBold },
});
