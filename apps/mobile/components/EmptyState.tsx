import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "../theme/ThemeProvider";
import { space, tap, type } from "../theme/tokens";

type Props = {
  title: string;
  body?: string;
  ctaLabel: string;
  onCta: () => void;
};

export function EmptyState({ title, body, ctaLabel, onCta }: Props) {
  const c = useColors();
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={[styles.illus, { backgroundColor: c.emeraldWash }]} />
      <Text style={[styles.title, { color: c.ink }]}>{title}</Text>
      {body ? (
        <Text style={[styles.body, { color: c.muted }]}>{body}</Text>
      ) : null}
      <Pressable
        onPress={onCta}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        style={[styles.cta, { backgroundColor: c.emerald }]}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  illus: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: space.md,
  },
  title: {
    fontSize: type.titleSm,
    fontWeight: "600",
    textAlign: "center",
  },
  body: {
    fontSize: type.bodySm,
    textAlign: "center",
    lineHeight: 20,
  },
  cta: {
    marginTop: space.md,
    minHeight: tap.min,
    paddingHorizontal: space.xl,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: type.body,
    fontWeight: "600",
  },
});
