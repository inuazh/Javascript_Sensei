import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theory, TheoryBlock } from '../../content/schema';
import {
  Button,
  CodeBlock,
  Colors,
  Fonts,
  Icon,
  Label,
  Radius,
  RichText,
  Screen,
  Spacing,
  Type,
} from '../../ui';
import { RunCode } from '../runner/RunCode';

/** `earlier`: code of the code blocks above this one on the card. */
function Block({ block, earlier }: { block: TheoryBlock; earlier: string[] }) {
  switch (block.type) {
    case 'text':
      return <RichText text={block.text} />;
    case 'code':
      return (
        <View style={styles.code}>
          <CodeBlock code={block.code} caption={block.caption} />
          <RunCode code={block.code} earlier={earlier} />
        </View>
      );
    case 'tip':
    case 'warning': {
      const color = block.type === 'tip' ? Colors.info : Colors.warning;
      return (
        <View style={[styles.callout, { borderLeftColor: color }]}>
          <View style={styles.calloutHead}>
            <Icon name={block.type === 'tip' ? 'info' : 'alert-triangle'} size={15} color={color} />
            <Text style={[styles.calloutLabel, { color }]}>
              {block.type === 'tip' ? 'совет' : 'осторожно'}
            </Text>
          </View>
          <RichText text={block.text} style={styles.calloutText} />
        </View>
      );
    }
  }
}

interface TheoryViewProps {
  title: string;
  label: string;
  theory: Theory;
  onStart: () => void;
  onClose: () => void;
}

export function TheoryView({ title, label, theory, onStart, onClose }: TheoryViewProps) {
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footer}>
          <Button title="К практике" icon="arrow-right" onPress={onStart} />
        </View>
      }
    >
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
        style={styles.close}
      >
        <Icon name="x" size={22} color={Colors.textMuted} />
      </Pressable>
      <Label>{`теория · ${label.toLowerCase()}`}</Label>
      <Text style={Type.h1}>{title}</Text>
      {theory.blocks.map((block, i) => (
        <Block key={i} block={block} earlier={earlierCode(theory, i)} />
      ))}
    </Screen>
  );
}

function earlierCode(theory: Theory, index: number): string[] {
  return theory.blocks.slice(0, index).flatMap(b => (b.type === 'code' ? [b.code] : []));
}

const styles = StyleSheet.create({
  close: { alignSelf: 'flex-start' },
  code: { gap: Spacing.sm },
  callout: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  calloutHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  calloutLabel: { fontFamily: Fonts.monoBold, fontSize: 12 },
  calloutText: { fontSize: 14, lineHeight: 21 },
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
