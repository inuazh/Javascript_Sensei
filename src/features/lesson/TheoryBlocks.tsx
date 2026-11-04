import { StyleSheet, Text, View } from 'react-native';
import type { Theory, TheoryBlock } from '../../content/schema';
import { CodeBlock, Colors, Fonts, Icon, Radius, RichText, Spacing } from '../../ui';
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

/**
 * The blocks of a theory card: text, code with «Запустить», tips and warnings.
 * Rendered as siblings, so the parent's gap spaces them.
 */
export function TheoryBlocks({ theory }: { theory: Theory }) {
  return (
    <>
      {theory.blocks.map((block, i) => (
        <Block key={i} block={block} earlier={earlierCode(theory, i)} />
      ))}
    </>
  );
}

function earlierCode(theory: Theory, index: number): string[] {
  return theory.blocks.slice(0, index).flatMap(b => (b.type === 'code' ? [b.code] : []));
}

const styles = StyleSheet.create({
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
});
