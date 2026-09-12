import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiError } from "./lib/api";
import { getAccessToken } from "./lib/auth";
import {
  favouriteListing,
  getMeFavourites,
  unfavouriteListing,
} from "./lib/discovery";
import { getListing } from "./lib/listings";
import {
  formatNgnFromKobo,
  listingImageUrl,
  type PublicListing,
} from "./lib/types";

type Props = {
  listingId: string | null;
  onClose: () => void;
};

export function ListingDetailModal({ listingId, onClose }: Props) {
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!listingId) {
      setListing(null);
      setSaved(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const data = await getListing(listingId, token);
        if (!cancelled) setListing(data);
        if (token && !cancelled) {
          try {
            const favs = await getMeFavourites(token);
            if (!cancelled) {
              setSaved(favs.items.some((i) => i.listing.id === listingId));
            }
          } catch {
            if (!cancelled) setSaved(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  async function toggleSave() {
    const token = await getAccessToken();
    if (!token || !listingId) {
      setToast("Sign in to save");
      return;
    }
    setSaving(true);
    const next = !saved;
    setSaved(next);
    try {
      if (next) await favouriteListing(listingId, token);
      else await unfavouriteListing(listingId, token);
      setToast(next ? "Saved" : "Removed");
    } catch (err) {
      setSaved(!next);
      setToast(err instanceof ApiError ? err.message : "Could not update");
    } finally {
      setSaving(false);
    }
  }

  const isSwap =
    listing?.sellingMode === "SWAP" || listing?.sellingMode === "SWAP_CASH";
  const isGiveAway = listing?.sellingMode === "GIVE_AWAY";
  const hero = listing
    ? listingImageUrl(
        [...listing.images].sort((a, b) => a.sortOrder - b.sortOrder)[0],
      )
    : null;

  return (
    <Modal
      visible={Boolean(listingId)}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.brand}>ReWorth</Text>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#0E9F6E" />
          </View>
        ) : error || !listing ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error ?? "Unavailable"}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            {hero ? (
              <Image
                source={{ uri: hero }}
                style={styles.hero}
                resizeMode="cover"
                accessibilityLabel="Listing photo"
              />
            ) : (
              <View style={[styles.hero, styles.heroEmpty]}>
                <Text style={styles.muted}>No photo</Text>
              </View>
            )}

            <Text style={styles.price}>
              {isGiveAway
                ? "Free"
                : isSwap
                  ? "Swap"
                  : formatNgnFromKobo(listing.priceKobo)}
              {!isGiveAway && !isSwap && listing.negotiable
                ? " · Negotiable"
                : ""}
            </Text>
            <Text style={styles.title}>{listing.title || "Untitled"}</Text>
            <Text style={styles.meta}>
              {listing.condition} · {listing.community || "Lagos"}
            </Text>

            <View style={styles.seller}>
              <Text style={styles.sellerName}>
                {listing.seller.displayName}
                {listing.seller.verificationBadge ? " · Verified" : ""}
              </Text>
              <Text style={styles.muted}>
                Rating · {listing.seller.ratingLabel}
              </Text>
            </View>

            <Text style={styles.section}>Description</Text>
            <Text style={styles.copy}>
              {listing.description || "No description."}
            </Text>

            <Text style={styles.section}>Delivery</Text>
            <Text style={styles.copy}>
              {[
                listing.fulfilmentPickup ? "Pickup" : null,
                listing.fulfilmentMeet ? "Meet" : null,
                listing.fulfilmentDelivery
                  ? "Delivery (quote at checkout)"
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Not set"}
            </Text>

            {listing.buyerProtection ? (
              <View style={styles.protect}>
                <Text style={styles.protectTitle}>Buyer protection</Text>
                <Text style={styles.muted}>
                  Pay on ReWorth when available — funds held until you confirm.
                </Text>
              </View>
            ) : null}

            {isSwap ? (
              <Text style={[styles.copy, styles.centerText]}>
                Interested in swapping? Chat with the seller
              </Text>
            ) : null}

            <View style={styles.actions}>
              {!isSwap ? (
                <>
                  <Action
                    label="Make offer"
                    onPress={() => setToast("Coming soon")}
                  />
                  {!isGiveAway ? (
                    <Action
                      label="Buy now"
                      primary
                      onPress={() => setToast("Coming soon")}
                    />
                  ) : null}
                </>
              ) : null}
              <Action label="Chat" onPress={() => setToast("Coming soon")} />
              <Action
                label={saved ? "Saved ♥" : "Save"}
                onPress={() => {
                  if (!saving) void toggleSave();
                }}
              />
              <Action
                label="Share"
                onPress={() =>
                  setToast(`Listing ${listing.id} — copy from web for now`)
                }
              />
            </View>

            {toast ? (
              <Pressable onPress={() => setToast(null)}>
                <Text style={styles.toast}>{toast}</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function Action({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      style={[styles.actionBtn, primary && styles.actionPrimary]}
      onPress={onPress}
    >
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAF9F7" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brand: { fontSize: 20, fontWeight: "700", color: "#111315" },
  close: { fontSize: 16, fontWeight: "600", color: "#0E9F6E" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: {
    width: "100%",
    height: 260,
    borderRadius: 20,
    backgroundColor: "#E5E2DC",
  },
  heroEmpty: { alignItems: "center", justifyContent: "center" },
  price: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "700",
    color: "#111315",
  },
  title: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "700",
    color: "#111315",
  },
  meta: { marginTop: 8, fontSize: 14, color: "#5C636A" },
  seller: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E2DC",
    backgroundColor: "#FFFFFF",
  },
  sellerName: { fontSize: 16, fontWeight: "700", color: "#111315" },
  section: {
    marginTop: 22,
    fontSize: 16,
    fontWeight: "700",
    color: "#111315",
  },
  copy: { marginTop: 8, fontSize: 15, lineHeight: 22, color: "#5C636A" },
  muted: { marginTop: 4, fontSize: 14, color: "#5C636A" },
  protect: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#D1FAE5",
  },
  protectTitle: { fontSize: 14, fontWeight: "700", color: "#0E9F6E" },
  centerText: { textAlign: "center", marginTop: 16 },
  actions: { marginTop: 24, gap: 10 },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#E5E2DC",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  actionPrimary: {
    backgroundColor: "#0E9F6E",
    borderColor: "#0E9F6E",
  },
  actionText: { fontSize: 15, fontWeight: "700", color: "#111315" },
  actionTextPrimary: { color: "#FFFFFF" },
  toast: {
    marginTop: 16,
    textAlign: "center",
    color: "#0E9F6E",
    fontWeight: "600",
  },
  error: { color: "#DC2626", fontSize: 15 },
});
