import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "../theme/ThemeProvider";
import { radius, space, tap, type } from "../theme/tokens";
import { hapticLight } from "../theme/haptics";

export type BottomNavTab = "home" | "discover" | "sell" | "chats" | "profile";

type Props = {
  active: BottomNavTab;
  onChange: (tab: BottomNavTab) => void;
};

const TABS: { id: BottomNavTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "discover", label: "Discover" },
  { id: "sell", label: "SELL" },
  { id: "chats", label: "Chats" },
  { id: "profile", label: "Profile" },
];

/** Home · Discover · SELL (elevated emerald) · Chats · Profile */
export function BottomNav({ active, onChange }: Props) {
  const c = useColors();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          shadowColor: c.ink,
        },
      ]}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        if (tab.id === "sell") {
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                void hapticLight();
                onChange("sell");
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel="Sell"
              style={styles.sellWrap}
            >
              <View
                style={[
                  styles.sellFab,
                  {
                    backgroundColor: c.emerald,
                    shadowColor: c.emerald,
                  },
                ]}
              >
                <Text style={styles.sellLabel}>SELL</Text>
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={tab.id}
            onPress={() => {
              void hapticLight();
              onChange(tab.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            style={styles.tab}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? c.emerald : c.muted,
                  fontWeight: selected ? "600" : "500",
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.sm,
    paddingBottom: space.md,
    minHeight: 64,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: tap.min,
    minWidth: tap.min,
  },
  label: {
    fontSize: type.meta,
  },
  sellWrap: {
    flex: 1,
    alignItems: "center",
    marginTop: -20,
  },
  sellFab: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  sellLabel: {
    color: "#FFFFFF",
    fontSize: type.meta,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
