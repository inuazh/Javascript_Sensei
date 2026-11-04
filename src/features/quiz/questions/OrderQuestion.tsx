import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import type { OrderQuestion as OrderQuestionT } from '../../../content/schema';
import { useFeedback } from '../../../services/feedback';
import { Colors, Fonts, Radius, Spacing, alpha } from '../../../ui';
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
      {!revealed && <Text style={styles.hint}>☰ Перетащи строки в правильном порядке</Text>}
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
                <Text style={[styles.text, isDragging && { color: Colors.yellow }]}>
                  {question.lines[lineIndex]}
                </Text>
                {!revealed && <Text style={styles.handle}>☰</Text>}
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
  hint: { color: Colors.textMuted, fontSize: 12 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  lineDragging: {
    backgroundColor: alpha(Colors.yellow, 0.1),
    borderColor: alpha(Colors.yellow, 0.5),
  },
  lineTarget: { borderColor: alpha(Colors.yellow, 0.4), borderStyle: 'dashed' },
  lineRight: {
    backgroundColor: alpha(Colors.success, 0.1),
    borderColor: alpha(Colors.success, 0.5),
  },
  lineWrong: {
    backgroundColor: alpha(Colors.danger, 0.08),
    borderColor: alpha(Colors.danger, 0.4),
  },
  index: { width: 20, color: Colors.textMuted, fontWeight: '700', fontSize: 12 },
  text: { flex: 1, fontFamily: Fonts.mono, fontSize: 13, color: 'rgba(255,255,255,0.88)' },
  handle: { color: Colors.textDisabled, fontSize: 16 },
});
