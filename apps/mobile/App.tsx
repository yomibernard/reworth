import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

type Tab = "home" | "discover" | "sell" | "chats" | "profile";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "discover", label: "Discover" },
  { id: "sell", label: "SELL" },
  { id: "chats", label: "Chats" },
  { id: "profile", label: "Profile" },
];

export default function App() {
  const [active, setActive] = useState<Tab>("home");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.screen} accessibilityRole="summary">
        <Text style={styles.brand} accessibilityRole="header">
          ReWorth
        </Text>
        <Text style={styles.copy}>
          {active === "sell"
            ? "Ready when you are — list something Lagos will love."
            : `${TABS.find((t) => t.id === active)?.label} — coming in Phase 1.`}
        </Text>
      </View>

      <View
        style={styles.nav}
        accessibilityRole="tablist"
        accessibilityLabel="Primary"
      >
        {TABS.map((tab) => {
          const isSell = tab.id === "sell";
          const isActive = active === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              onPress={() => setActive(tab.id)}
              style={[
                styles.tab,
                isSell && styles.sellTab,
                isActive && !isSell && styles.tabActive,
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isSell && styles.sellLabel,
                  isActive && !isSell && styles.tabLabelActive,
                ]}
              >
                {isSell ? "+" : tab.label}
              </Text>
              {isSell ? (
                <Text style={styles.sellCaption}>SELL</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF9F7",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    justifyContent: "center",
  },
  brand: {
    fontSize: 40,
    fontWeight: "700",
    color: "#111315",
    letterSpacing: -0.5,
  },
  copy: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    color: "#5C636A",
  },
  nav: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E2DC",
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabActive: {},
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5C636A",
  },
  tabLabelActive: {
    color: "#0E9F6E",
  },
  sellTab: {
    marginTop: -22,
    width: 56,
    height: 56,
    flex: 0,
    borderRadius: 28,
    backgroundColor: "#0E9F6E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0E9F6E",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sellLabel: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 30,
  },
  sellCaption: {
    position: "absolute",
    bottom: -18,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#0E9F6E",
  },
});
