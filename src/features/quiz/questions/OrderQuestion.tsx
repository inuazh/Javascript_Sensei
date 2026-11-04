import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import type { OrderQuestion as OrderQuestionT } from '../../../content/schema';
import { useFeedback } from '../../../services/feedback';
import { Colors, Fonts, Icon, Radius, Spacing } from '../../../ui';
import type { QuestionViewProps } from '../types';

const ITEM_GAP = 8;

/** Drag lines into the right order. The answer is the current order of line indexes. */
export function OrderQuestion({
  question,
  answer,
  onChange,
  revealed,
}: QuestionViewProps<OrderQuestionT, number[]>) {
  const order = answer ?? question.shuffled;
  const feedback = useFeedback();
  const [dragging, setDragging] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const itemHeight = useRef(56);
  const draggingRef = useRef<number | null>(null);

  const targetIndex = (from: number, dy: number) =>
    Math.max(0, Math.min(order.length - 1, Math.round(from + dy / itemHeight.current)));

  const handlers = useMemo(
    () =>
      order.map(
        (_, idx) =>
          PanResponder.create({
            onStartShouldSetPanResponder: () => !revealed && draggingRef.current === null,
            onPanResponderGrant: () => {
              draggingRef.current = idx;
              dragY.setValue(0);
              setDragging(idx);
              setHover(idx);
              feedback.tap();
            },
            onPanResponderMove: (_, { dy }) => {
              dragY.setValue(dy);
              setHover(targetIndex(idx, dy));
            },
            onPanResponderRelease: (_, { dy }) => {
              const to = targetIndex(idx, dy);
              dragY.setValue(0);
              draggingRef.current = null;
              setDragging(null);
              setHover(null);
              if (to !== idx) {
                const next = [...order];
                const [item] = next.splice(idx, 1);
                next.splice(to, 0, item);
                onChange(next);
              }
            },
            onPanResponderTerminate: () => {
              dragY.setValue(0);
              draggingRef.current = null;
              setDragging(null);
              setHover(null);
            },
          }).panHandlers,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers depend on the order only
    [order, revealed],
  );

  return (
    <View style={styles.wrap}>
      {!revealed && <Text style={styles.hint}>{'// перетащи строки в правильном порядке'}</Text>}
      <View>
        {order.map((lineIndex, idx) => {
          const isDragging = dragging === idx;
          const isTarget = hover === idx && dragging !== null && dragging !== idx;
          const isRight = revealed && lineIndex === idx;
          const isWrong = revealed && lineIndex !== idx;
          return (
            <Animated.View
              key={lineIndex}
              onLayout={
                idx === 0
                  ? e => {
                      itemHeight.current = e.nativeEvent.layout.height + ITEM_GAP;
                    }
                  : undefined
              }
              style={{
                marginBottom: ITEM_GAP,
                zIndex: isDragging ? 10 : 1,
                elevation: isDragging ? 8 : 0,
                transform: [
                  { translateY: isDragging ? dragY : 0 },
                  { scale: isDragging ? 1.03 : 1 },
                ],
              }}
              {...(revealed ? {} : handlers[idx])}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`Строка ${idx + 1}: ${question.lines[lineIndex]}`}
              accessibilityHint={revealed ? undefined : 'Смахни вверх или вниз, чтобы переместить'}
              accessibilityActions={
                revealed
                  ? []
                  : [
                      { name: 'decrement', label: 'Переместить вверх' },
                      { name: 'increment', label: 'Переместить вниз' },
                    ]
              }
              onAccessibilityAction={e => {
                const to = e.nativeEvent.actionName === 'decrement' ? idx - 1 : idx + 1;
                if (to < 0 || to >= order.length) return;
                const next = [...order];
                [next[idx], next[to]] = [next[to], next[idx]];
                onChange(next);
              }}
            >
              <View
                style={[
                  styles.line,
                  isDragging && styles.lineDragging,
                  isTarget && styles.lineTarget,
                  isRight && styles.lineRight,
                  isWrong && styles.lineWrong,
                ]}
              >
                <Text style={styles.index}>{idx + 1}</Text>
                <Text style={[styles.text, isDragging && { color: Colors.accent }]}>
                  {question.lines[lineIndex]}
                </Text>
                {!revealed && <Icon name="menu" size={16} color={Colors.textDisabled} />}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  hint: { fontFamily: Fonts.mono, color: Colors.textMuted, fontSize: 12 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: Colors.codeBackground,
    borderColor: Colors.border,
    // On the web a mouse drag would select the text, which cancels the pan gesture.
    userSelect: 'none',
  },
  lineDragging: { borderColor: Colors.accent, backgroundColor: Colors.surfaceRaised },
  lineTarget: { borderColor: Colors.accent, borderStyle: 'dashed' },
  lineRight: { borderColor: Colors.success },
  lineWrong: { borderColor: Colors.danger },
  index: {
    width: 18,
    fontFamily: Fonts.mono,
    color: Colors.syntax.lineNumber,
    fontSize: 13,
    textAlign: 'right',
  },
  text: { flex: 1, fontFamily: Fonts.mono, fontSize: 13, color: Colors.syntax.text },
});
