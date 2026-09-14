import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useColors } from "../theme/ThemeProvider";
import { radius, space, tap, type } from "../theme/tokens";
import { hapticLight } from "../theme/haptics";

export type ListingCardProps = {
  title: string;
  priceLabel: string;
  distanceLabel?: string;
  community?: string;
  verified?: boolean;
  saved?: boolean;
  imageUri?: string;
  onPress?: () => void;
  onToggleSave?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function ListingCard({
  title,
  priceLabel,
  distanceLabel,
  community,
  verified,
  saved,
  imageUri,
  onPress,
  onToggleSave,
  style,
  accessibilityLabel,
}: ListingCardProps) {
  const c = useColors();
  const meta = [community, distanceLabel].filter(Boolean).join(" · ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        `${title}, ${priceLabel}${verified ? ", verified seller" : ""}`
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          opacity: pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      <View style={[styles.image, { backgroundColor: c.emeraldWash }]}>
        <Text style={[styles.noPhoto, { color: c.muted }]} numberOfLines={1}>
          {imageUri ? "Photo" : "No photo"}
        </Text>
        {verified ? (
          <View
            style={[styles.badge, { backgroundColor: c.goldWash }]}
            accessibilityLabel="Verified"
          >
            <Text style={[styles.badgeText, { color: c.gold }]}>Verified ✓</Text>
          </View>
        ) : null}
        {onToggleSave ? (
          <Pressable
            onPress={() => {
              void hapticLight();
              onToggleSave();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={saved ? "Remove from saved" : "Save listing"}
            style={[
              styles.heart,
              {
                backgroundColor: saved ? c.emerald : c.surface,
                borderColor: c.border,
              },
            ]}
          >
            <Text style={{ color: saved ? "#fff" : c.ink, fontSize: 14 }}>
              ♥
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text
          style={[styles.price, { color: c.ink }]}
          numberOfLines={1}
        >
          {priceLabel}
        </Text>
        <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  image: {
    aspectRatio: 3 / 4,
    alignItems: "center",
    justifyContent: "center",
  },
  noPhoto: {
    fontSize: type.meta,
  },
  badge: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  heart: {
    position: "absolute",
    top: space.sm,
    right: space.sm,
    width: tap.min,
    height: tap.min,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: space.md,
    gap: 2,
  },
  price: {
    fontSize: type.titleSm,
    fontWeight: "700",
  },
  title: {
    fontSize: type.bodySm,
    fontWeight: "500",
  },
  meta: {
    fontSize: type.meta,
  },
});
