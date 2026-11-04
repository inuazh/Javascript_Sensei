import { StyleSheet, Text, View } from 'react-native';
import type { Theory, TheoryBlock } from '../../content/schema';
import {
  Button,
  CodeBlock,
  Colors,
  Radius,
  RichText,
  Screen,
  Spacing,
  Type,
  alpha,
} from '../../ui';

function Block({ block }: { block: TheoryBlock }) {
  switch (block.type) {
    case 'text':
      return <RichText text={block.text} />;
    case 'code':
      return <CodeBlock code={block.code} caption={block.caption} />;
    case 'tip':
    case 'warning': {
      const color = block.type === 'tip' ? Colors.blue : Colors.orange;
      return (
        <View
          style={[
            styles.callout,
            { backgroundColor: alpha(color, 0.08), borderColor: alpha(color, 0.25) },
          ]}
        >
          <Text style={styles.calloutIcon}>{block.type === 'tip' ? '💡' : '⚠️'}</Text>
          <RichText text={block.text} style={styles.calloutText} />
        </View>
      );
    }
  }
}

interface TheoryViewProps {
  title: string;
  label: string;
  color: string;
  theory: Theory;
  onStart: () => void;
  onClose: () => void;
}

export function TheoryView({ title, label, color, theory, onStart, onClose }: TheoryViewProps) {
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footer}>
          <Button title="К практике →" onPress={onStart} color={color} />
        </View>
      }
    >
      <Text
        style={styles.close}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
      >
        ✕
      </Text>
      <Text style={[Type.caption, { color }]}>{label}</Text>
      <Text style={Type.h1}>{title}</Text>
      {theory.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { fontSize: 20, color: Colors.textMuted, alignSelf: 'flex-start', padding: 4 },
  callout: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  calloutIcon: { fontSize: 18 },
  calloutText: { flex: 1, fontSize: 14, lineHeight: 21 },
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
