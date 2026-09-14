import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { EmptyState } from "./components/EmptyState";
import { ListingCard } from "./components/ListingCard";
import { HomeSkeleton } from "./components/Skeleton";
import { BottomSheet } from "./components/BottomSheet";
import {
  cacheHome,
  fetchHome,
  loadCachedHome,
  type HomeRail,
} from "./lib/discovery";
import { formatNgnFromKobo, type PublicListing } from "./lib/types";
import { useColors } from "./theme/ThemeProvider";

type Props = {
  community?: string;
  cityLabel?: string;
  onOpenSearch: () => void;
  onOpenListing: (id: string) => void;
  onOpenTool?: (tool: "ask" | "worth" | "scan" | "consign" | "pickup") => void;
};

export function DiscoveryHome({
  community,
  cityLabel = "Lagos",
  onOpenSearch,
  onOpenListing,
  onOpenTool,
}: Props) {
  const [rails, setRails] = useState<HomeRail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setError(null);
      try {
        const data = await fetchHome({
          community: community || undefined,
        });
        setRails(data.rails ?? []);
        setFromCache(false);
        await cacheHome(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load home");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [community],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadCachedHome();
      if (!cancelled && cached?.rails?.length) {
        setRails(cached.rails);
        setFromCache(true);
        setLoading(false);
      }
      if (!cancelled) await load({ soft: Boolean(cached?.rails?.length) });
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const c = useColors();

  return (
    <ScrollView
      contentContainerStyle={[styles.pad, { backgroundColor: c.canvas }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load({ soft: true });
          }}
          tintColor={c.emerald}
        />
      }
    >
      <Pressable
        style={[
          styles.locationPill,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
        onPress={onOpenSearch}
        accessibilityRole="button"
        accessibilityLabel={`Location ${community || cityLabel}. Open search and radius.`}
      >
        <Text style={[styles.locationText, { color: c.ink }]} numberOfLines={1}>
          {community || cityLabel} · All Lagos ▾
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.searchBar,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
        onPress={onOpenSearch}
        accessibilityRole="search"
        accessibilityLabel="Open search"
      >
        <Text style={[styles.searchPlaceholder, { color: c.muted }]}>
          Search {cityLabel}…
        </Text>
      </Pressable>
      <Text style={[styles.nlHint, { color: c.muted }]}>
        Try: sofas under ₦500k in Lekki
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        decelerationRate="fast"
        snapToInterval={88}
      >
        {["Home", "Electronics", "Phones", "Fashion", "Kids", "Sports"].map(
          (label) => (
            <Pressable
              key={label}
              style={[
                styles.catChip,
                { backgroundColor: c.emeraldWash, borderColor: c.border },
              ]}
              onPress={onOpenSearch}
              accessibilityRole="button"
              accessibilityLabel={`Category ${label}`}
            >
              <Text style={[styles.catChipText, { color: c.ink }]}>{label}</Text>
            </Pressable>
          ),
        )}
      </ScrollView>

      <View style={styles.toolsRow} accessibilityLabel="AI & platform tools">
        {(
          [
            ["ask", "Ask"],
            ["worth", "Worth"],
            ["scan", "Scan"],
            ["consign", "Consign"],
            ["pickup", "Pickup"],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            style={[styles.toolChip, { borderColor: c.border }]}
            onPress={() => onOpenTool?.(id)}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={[styles.toolChipText, { color: c.emerald }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {fromCache ? (
        <Text style={[styles.cacheHint, { color: c.muted }]}>
          Showing last home · refreshing…
        </Text>
      ) : null}

      {loading && rails.length === 0 ? <HomeSkeleton /> : null}

      {error && rails.length === 0 ? (
        <EmptyState
          title="Couldn’t load home"
          body={error}
          ctaLabel="Retry"
          onCta={() => void load()}
        />
      ) : null}

      {rails.map((rail) => (
        <View key={rail.id} style={styles.rail}>
          <View style={styles.railHeader}>
            <Text style={[styles.railTitle, { color: c.ink }]}>{rail.title}</Text>
            <Pressable onPress={onOpenSearch} accessibilityRole="button">
              <Text style={[styles.seeAll, { color: c.emerald }]}>See all</Text>
            </Pressable>
          </View>
          {rail.items.length === 0 ? (
            <Text style={[styles.empty, { color: c.muted }]}>
              {rail.emptyMessage ?? "Nothing here yet."}
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railRow}
            >
              {rail.items.map((item) => {
                const price =
                  item.sellingMode === "GIVE_AWAY"
                    ? "Free"
                    : item.sellingMode === "SWAP" ||
                        item.sellingMode === "SWAP_CASH"
                      ? "Swap"
                      : formatNgnFromKobo(item.priceKobo);
                return (
                  <ListingCard
                    key={item.id}
                    title={item.title || "Untitled"}
                    priceLabel={price}
                    community={
                      item.communityChip?.name || item.community || undefined
                    }
                    verified={Boolean(item.seller?.verificationBadge)}
                    onPress={() => onOpenListing(item.id)}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

/** Lightweight search panel used from Discover tab */
export function SearchPanel({
  onOpenListing,
  onBack,
}: {
  onOpenListing: (id: string) => void;
  onBack?: () => void;
}) {
  const c = useColors();
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState("");
  const [condition, setCondition] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [items, setItems] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const [total, setTotal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  async function run(append = false) {
    setLoading(true);
    setError(null);
    try {
      const { searchListings } = await import("./lib/discovery");
      const res = await searchListings({
        q: q.trim() || undefined,
        community: community || undefined,
        condition: condition || undefined,
        cursor: append ? cursor : undefined,
        limit: 20,
        sort: "newest",
      });
      let next = res.items;
      if (verifiedOnly) {
        next = next.filter((i) => i.seller?.verificationBadge);
      }
      setItems((prev) => (append ? [...prev, ...next] : next));
      setCursor(res.nextCursor);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      if (!append) setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const conditions = ["", "LIKE_NEW", "GOOD", "FAIR"];

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.pad, { backgroundColor: c.canvas }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchHeader}>
          {onBack ? (
            <Pressable onPress={onBack} accessibilityRole="button">
              <Text style={[styles.back, { color: c.emerald }]}>← Home</Text>
            </Pressable>
          ) : null}
          <Text
            style={[styles.brand, { color: c.ink }]}
            accessibilityRole="header"
          >
            Search
          </Text>
        </View>

        <TextInput
          style={[
            styles.input,
            { borderColor: c.border, color: c.ink, backgroundColor: c.surface },
          ]}
          value={q}
          onChangeText={setQ}
          placeholder="Try: sofas under ₦500k in Lekki"
          placeholderTextColor={c.muted}
          returnKeyType="search"
          onSubmitEditing={() => void run(false)}
          accessibilityLabel="Search query"
        />

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Pressable
            style={[
              styles.secondaryBtn,
              { flex: 1, marginTop: 0, borderColor: c.border },
            ]}
            onPress={() => setFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <Text style={[styles.secondaryBtnText, { color: c.ink }]}>
              Filters
              {condition || community || verifiedOnly ? " · on" : ""}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.primaryBtn,
              { flex: 1, marginTop: 0, backgroundColor: c.emerald },
            ]}
            onPress={() => void run(false)}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "…" : "Search"}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={[styles.error, { color: c.error }]}>{error}</Text>
        ) : null}

        {!loading && items.length === 0 && !error ? (
          <EmptyState
            title="No results yet"
            body="Try a keyword or open Filters."
            ctaLabel="Search Lagos"
            onCta={() => void run(false)}
          />
        ) : null}

        {items.length > 0 ? (
          <Text style={[styles.metaCount, { color: c.muted }]}>
            {total} results
          </Text>
        ) : null}

        <View style={styles.masonry}>
          {items.map((item) => {
            const price =
              item.sellingMode === "GIVE_AWAY"
                ? "Free"
                : formatNgnFromKobo(item.priceKobo);
            return (
              <ListingCard
                key={item.id}
                title={item.title || "Untitled"}
                priceLabel={price}
                community={item.community || undefined}
                verified={Boolean(item.seller?.verificationBadge)}
                onPress={() => onOpenListing(item.id)}
                style={{ width: "48%", marginBottom: 12 }}
              />
            );
          })}
        </View>

        {cursor ? (
          <Pressable
            style={[styles.secondaryBtn, { borderColor: c.border }]}
            onPress={() => void run(true)}
            disabled={loading}
          >
            <Text style={[styles.secondaryBtnText, { color: c.ink }]}>
              {loading ? "Loading…" : "Load more"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={filtersOpen}
        title="Filters"
        onClose={() => setFiltersOpen(false)}
      >
        <Text style={[styles.label, { color: c.muted }]}>Community</Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: c.border, color: c.ink, backgroundColor: c.surface },
          ]}
          value={community}
          onChangeText={setCommunity}
          placeholder="e.g. Lekki Ph1"
          placeholderTextColor={c.muted}
        />
        <Text style={[styles.label, { color: c.muted }]}>Condition</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {conditions.map((cond) => {
            const selected = condition === cond;
            const label = cond || "Any";
            return (
              <Pressable
                key={label}
                onPress={() => setCondition(cond)}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: selected ? c.emerald : c.border,
                  backgroundColor: selected ? c.emeraldWash : c.surface,
                  justifyContent: "center",
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={{
                    color: selected ? c.emerald : c.ink,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => setVerifiedOnly((v) => !v)}
          style={{
            marginTop: 16,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: verifiedOnly }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
              backgroundColor: verifiedOnly ? c.emerald : c.surface,
            }}
          />
          <Text style={{ color: c.ink, fontSize: 15 }}>Verified sellers</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, { borderColor: c.border }]}
          onPress={() => {
            setCommunity("");
            setCondition("");
            setVerifiedOnly(false);
          }}
        >
          <Text style={[styles.secondaryBtnText, { color: c.ink }]}>
            Clear all
          </Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: c.emerald }]}
          onPress={() => {
            setFiltersOpen(false);
            void run(false);
          }}
        >
          <Text style={styles.primaryBtnText}>Apply</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}

export function FavouritesPanel({
  onOpenListing,
}: {
  onOpenListing: (id: string) => void;
}) {
  const [items, setItems] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { getAccessToken } = await import("./lib/auth");
      const token = await getAccessToken();
      if (!token) {
        setError("Sign in to see saved items");
        setItems([]);
        return;
      }
      const { getMeFavourites } = await import("./lib/discovery");
      const res = await getMeFavourites(token);
      setItems(res.items.map((i) => i.listing));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.brand} accessibilityRole="header">
        Saved items
      </Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#0E9F6E" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          Heart a listing to keep it here.
        </Text>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            style={styles.listingRow}
            onPress={() => onOpenListing(item.id)}
          >
            <Text style={styles.tileTitle}>{item.title || "Untitled"}</Text>
            <Text style={styles.tileMeta}>
              {formatNgnFromKobo(item.priceKobo)}
              {item.community ? ` · ${item.community}` : ""}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingBottom: 32, paddingHorizontal: 16, paddingTop: 8 },
  locationPill: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  locationText: { fontSize: 15, fontWeight: "600" },
  searchBar: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  searchPlaceholder: { fontSize: 17 },
  nlHint: { marginTop: 8, fontSize: 13 },
  catRow: { gap: 8, paddingVertical: 16 },
  catChip: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  catChipText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: "#101418",
    letterSpacing: -0.5,
  },
  hero: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "600",
    color: "#101418",
  },
  cacheHint: {
    marginTop: 6,
    fontSize: 13,
  },
  toolsRow: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toolChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  toolChipText: { fontSize: 13, fontWeight: "600" },
  rail: { marginTop: 28 },
  railHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  railTitle: { fontSize: 20, fontWeight: "600" },
  seeAll: { fontSize: 13, fontWeight: "600" },
  railRow: { gap: 12, paddingRight: 8 },
  empty: { fontSize: 15, lineHeight: 22 },
  errorBox: { marginTop: 24, gap: 8 },
  error: { color: "#D64545", fontSize: 15 },
  retry: { color: "#0E9F6E", fontWeight: "600", fontSize: 15 },
  searchHeader: { gap: 8, marginBottom: 8 },
  back: { color: "#0E9F6E", fontWeight: "600", fontSize: 15 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E1DA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    backgroundColor: "#FFFFFF",
    color: "#101418",
    marginTop: 8,
  },
  label: { marginTop: 16, fontSize: 13, color: "#5C6470", fontWeight: "500" },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#0E9F6E",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E1DA",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#101418", fontSize: 15, fontWeight: "600" },
  metaCount: { marginTop: 16, fontSize: 13, color: "#5C6470" },
  listingRow: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E1DA",
    backgroundColor: "#FFFFFF",
  },
  tileTitle: { fontSize: 15, fontWeight: "500", color: "#101418" },
  tileMeta: { marginTop: 4, fontSize: 13, color: "#5C6470" },
  tile: {},
  tilePrice: {},
  masonry: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
