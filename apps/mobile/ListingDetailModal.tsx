import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiError } from "./lib/api";
import { getAccessToken } from "./lib/auth";
import {
  createConversation,
  createOffer,
  nairaToKobo,
} from "./lib/chat";
import {
  favouriteListing,
  getMeFavourites,
  unfavouriteListing,
} from "./lib/discovery";
import { getListing } from "./lib/listings";
import { formatResponseShort } from "./lib/trust";
import {
  formatNgnFromKobo,
  listingImageUrl,
  type PublicListing,
} from "./lib/types";

type Props = {
  listingId: string | null;
  onClose: () => void;
  onOpenChat?: (conversationId: string) => void;
  onBuyNow?: (listingId: string) => void;
  onOpenSeller?: (sellerId: string) => void;
};

export function ListingDetailModal({
  listingId,
  onClose,
  onOpenChat,
  onBuyNow,
  onOpenSeller,
}: Props) {
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerNaira, setOfferNaira] = useState("");
  const [offerBusy, setOfferBusy] = useState(false);

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

  async function startChat() {
    const token = await getAccessToken();
    if (!token || !listingId) {
      setToast("Sign in to chat");
      return;
    }
    setChatBusy(true);
    try {
      const conv = await createConversation(token, listingId);
      onOpenChat?.(conv.id);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Could not start chat");
    } finally {
      setChatBusy(false);
    }
  }

  async function submitOffer() {
    const token = await getAccessToken();
    if (!token || !listingId) {
      setToast("Sign in to offer");
      return;
    }
    const value = Number(offerNaira.replace(/,/g, ""));
    if (!Number.isFinite(value) || value < 1) {
      setToast("Enter an amount in ₦");
      return;
    }
    setOfferBusy(true);
    try {
      const conv = await createConversation(token, listingId);
      await createOffer(token, listingId, {
        amountKobo: nairaToKobo(value),
        conversationId: conv.id,
      });
      setOfferOpen(false);
      setOfferNaira("");
      onOpenChat?.(conv.id);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Offer failed");
    } finally {
      setOfferBusy(false);
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

            <Pressable
              style={styles.seller}
              onPress={() => onOpenSeller?.(listing.seller.id)}
              accessibilityRole="button"
              accessibilityLabel={`View ${listing.seller.displayName}'s profile`}
            >
              <Text style={styles.sellerName}>
                {listing.seller.displayName}
                {listing.seller.verificationBadge
                  ? " · Identity Verified ✓"
                  : ""}
              </Text>
              <Text style={styles.muted}>{listing.seller.ratingLabel}</Text>
              {listing.seller.trustBadge ? (
                <Text style={styles.trustBadge}>{listing.seller.trustBadge}</Text>
              ) : null}
              {formatResponseShort(listing.seller.responseMinutes) ? (
                <Text style={styles.muted}>
                  {formatResponseShort(listing.seller.responseMinutes)}
                </Text>
              ) : null}
              <Text style={styles.profileLink}>View profile →</Text>
            </Pressable>

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
                    onPress={() => setOfferOpen(true)}
                  />
                  {!isGiveAway ? (
                    <Action
                      label="Buy now"
                      primary
                      onPress={() => {
                        if (listingId) onBuyNow?.(listingId);
                        else setToast("Coming soon");
                      }}
                    />
                  ) : null}
                </>
              ) : null}
              <Action
                label={chatBusy ? "Opening…" : "Chat"}
                onPress={() => {
                  if (!chatBusy) void startChat();
                }}
              />
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

        <Modal visible={offerOpen} animationType="slide" transparent>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Make offer</Text>
              <Text style={styles.label}>Amount (₦)</Text>
              <TextInput
                style={styles.input}
                value={offerNaira}
                onChangeText={setOfferNaira}
                keyboardType="numeric"
                placeholder="45000"
              />
              <Pressable
                style={[styles.primaryBtn, offerBusy && styles.disabled]}
                disabled={offerBusy}
                onPress={() => void submitOffer()}
              >
                <Text style={styles.primaryBtnText}>
                  {offerBusy ? "Sending…" : "Send offer"}
                </Text>
              </Pressable>
              <Pressable onPress={() => setOfferOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
  trustBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "#F5EDD0",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#111315",
  },
  profileLink: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#0E9F6E",
  },
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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FAF9F7",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#111315" },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#111315",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E2DC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111315",
    backgroundColor: "#FFFFFF",
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#0E9F6E",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  cancel: {
    marginTop: 14,
    textAlign: "center",
    color: "#0E9F6E",
    fontWeight: "600",
  },
  disabled: { opacity: 0.55 },
});
