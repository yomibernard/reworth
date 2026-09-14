import { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BottomSheet } from "./components/BottomSheet";
import { Skeleton } from "./components/Skeleton";
import { ApiError, apiFetch } from "./lib/api";
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
import { fetchRecommendations } from "./lib/intelligence";
import {
  BOOST_DURATIONS_HOURS,
  newIdempotencyKey,
  purchaseBoost,
  purchaseFeatured,
  quoteBoost,
  quoteFeatured,
  type BoostQuote,
  type FeaturedQuote,
} from "./lib/monetization";
import {
  createGiveawayClaim,
  createSwapProposal,
  myLiveListings,
} from "./lib/swap";
import { formatResponseShort } from "./lib/trust";
import {
  formatNgnFromKobo,
  listingImageUrl,
  type MeResponse,
  type PublicListing,
} from "./lib/types";
import { hapticLight } from "./theme/haptics";
import { useColors } from "./theme/ThemeProvider";

const GALLERY_W = Dimensions.get("window").width;

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
  const [swapOpen, setSwapOpen] = useState(false);
  const [myListings, setMyListings] = useState<PublicListing[]>([]);
  const [swapSelected, setSwapSelected] = useState<string | null>(null);
  const [swapCashNaira, setSwapCashNaira] = useState("0");
  const [swapBusy, setSwapBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [similar, setSimilar] = useState<PublicListing[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostHours, setBoostHours] = useState<(typeof BOOST_DURATIONS_HOURS)[number]>(24);
  const [boostQuote, setBoostQuote] = useState<BoostQuote | null>(null);
  const [featuredQuote, setFeaturedQuote] = useState<FeaturedQuote | null>(null);
  const [boostBusy, setBoostBusy] = useState(false);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const c = useColors();

  const gallery = useMemo(() => {
    if (!listing?.images?.length) return [] as string[];
    return [...listing.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => listingImageUrl(img))
      .filter((u): u is string => Boolean(u));
  }, [listing]);

  async function reloadListing(id: string, token?: string | null) {
    const data = await getListing(id, token);
    setListing(data);
    return data;
  }

  useEffect(() => {
    if (!listingId) {
      setListing(null);
      setSaved(false);
      setSimilar([]);
      setMeId(null);
      setBoostOpen(false);
      setGalleryIndex(0);
      setDescExpanded(false);
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
        if (!cancelled) {
          void fetchRecommendations(
            {
              surface: "similar",
              listingId,
              city: data.city ?? undefined,
              limit: 6,
            },
            token,
          )
            .then((res) => {
              if (!cancelled) setSimilar(res.items ?? []);
            })
            .catch(() => {
              if (!cancelled) setSimilar([]);
            });
        }
        if (token && !cancelled) {
          try {
            const me = await apiFetch<MeResponse>("/me", { token });
            if (!cancelled) setMeId(me.id);
          } catch {
            if (!cancelled) setMeId(null);
          }
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

  useEffect(() => {
    if (!boostOpen) return;
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      setQuoteBusy(true);
      try {
        const [bq, fq] = await Promise.all([
          quoteBoost(token, boostHours),
          quoteFeatured(token),
        ]);
        if (!cancelled) {
          setBoostQuote(bq);
          setFeaturedQuote(fq);
        }
      } catch {
        if (!cancelled) {
          setBoostQuote(null);
          setFeaturedQuote(null);
        }
      } finally {
        if (!cancelled) setQuoteBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boostOpen, boostHours]);

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

  async function openSwapSheet() {
    const token = await getAccessToken();
    if (!token) {
      setToast("Sign in to propose a swap");
      return;
    }
    setSwapBusy(true);
    try {
      const res = await myLiveListings(token);
      const items = res.items.filter((l) => l.id !== listingId);
      setMyListings(items);
      setSwapSelected(items[0]?.id ?? null);
      setSwapCashNaira("0");
      setSwapOpen(true);
      if (!items.length) {
        setToast("List an item first, then propose a swap");
      }
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Could not load listings");
    } finally {
      setSwapBusy(false);
    }
  }

  async function submitSwap() {
    if (!listingId || !swapSelected) {
      setToast("Pick one of your live listings");
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setToast("Sign in to propose a swap");
      return;
    }
    setSwapBusy(true);
    try {
      const cashComponentKobo = Math.round(Number(swapCashNaira || 0) * 100);
      await createSwapProposal(token, listingId, {
        offeredListingId: swapSelected,
        cashComponentKobo: Number.isFinite(cashComponentKobo)
          ? cashComponentKobo
          : 0,
      });
      setSwapOpen(false);
      setToast("Swap proposal sent");
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Proposal failed");
    } finally {
      setSwapBusy(false);
    }
  }

  async function claimGiveaway() {
    if (!listingId) return;
    const token = await getAccessToken();
    if (!token) {
      setToast("Sign in to claim");
      return;
    }
    setClaimBusy(true);
    try {
      await createGiveawayClaim(token, listingId);
      setToast("Claim sent — seller will review");
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Claim failed");
    } finally {
      setClaimBusy(false);
    }
  }

  async function confirmBoost() {
    if (!listingId) return;
    const token = await getAccessToken();
    if (!token) {
      setToast("Sign in to boost");
      return;
    }
    setBoostBusy(true);
    try {
      await purchaseBoost(token, {
        listingId,
        hours: boostHours,
        idempotencyKey: newIdempotencyKey("boost"),
      });
      await reloadListing(listingId, token);
      setBoostOpen(false);
      setToast("Boost active");
    } catch {
      setToast("Boost failed — try again or contact support");
    } finally {
      setBoostBusy(false);
    }
  }

  async function confirmFeatured() {
    if (!listingId) return;
    const token = await getAccessToken();
    if (!token) {
      setToast("Sign in to feature");
      return;
    }
    setBoostBusy(true);
    try {
      await purchaseFeatured(token, {
        listingId,
        idempotencyKey: newIdempotencyKey("featured"),
      });
      await reloadListing(listingId, token);
      setBoostOpen(false);
      setToast("Featured active");
    } catch {
      setToast("Feature failed — try again or contact support");
    } finally {
      setBoostBusy(false);
    }
  }

  const isSwap =
    listing?.sellingMode === "SWAP" || listing?.sellingMode === "SWAP_CASH";
  const isGiveAway = listing?.sellingMode === "GIVE_AWAY";
  const isOwner = Boolean(meId && listing?.seller.id === meId);

  return (
    <Modal
      visible={Boolean(listingId)}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.safe, { backgroundColor: c.canvas }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Text style={[styles.brand, { color: c.ink }]}>ReWorth</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={[styles.close, { color: c.emerald }]}>Close</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton height={280} />
            <Skeleton height={24} width="40%" />
            <Skeleton height={20} width="70%" />
            <Skeleton height={48} />
          </View>
        ) : error || !listing ? (
          <View style={styles.center}>
            <Text style={[styles.error, { color: c.error }]}>
              {error ?? "Unavailable"}
            </Text>
          </View>
        ) : (
          <>
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: 120 }]}
          >
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const i = Math.round(
                    e.nativeEvent.contentOffset.x / GALLERY_W,
                  );
                  setGalleryIndex(i);
                }}
                accessibilityLabel="Listing photo gallery"
              >
                {(gallery.length ? gallery : [null]).map((uri, i) =>
                  uri ? (
                    <Image
                      key={`${uri}-${i}`}
                      source={{ uri }}
                      style={[styles.hero, { width: GALLERY_W }]}
                      resizeMode="cover"
                      accessibilityLabel={`Photo of ${listing.title || "listing"}, ${i + 1} of ${gallery.length || 1}`}
                    />
                  ) : (
                    <View
                      key="empty"
                      style={[
                        styles.hero,
                        styles.heroEmpty,
                        { width: GALLERY_W, backgroundColor: c.emeraldWash },
                      ]}
                    >
                      <Text style={{ color: c.muted }}>No photo</Text>
                    </View>
                  ),
                )}
              </ScrollView>
              {gallery.length > 0 ? (
                <View
                  style={[styles.counterChip, { backgroundColor: c.surface }]}
                  accessibilityLabel={`Photo ${galleryIndex + 1} of ${gallery.length}`}
                >
                  <Text style={{ color: c.ink, fontSize: 13, fontWeight: "600" }}>
                    {galleryIndex + 1}/{gallery.length}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: c.ink }]}>
                {isGiveAway
                  ? "Free"
                  : isSwap
                    ? "Swap"
                    : formatNgnFromKobo(listing.priceKobo)}
              </Text>
              {!isGiveAway && !isSwap && listing.negotiable ? (
                <View
                  style={[styles.negoChip, { backgroundColor: c.emeraldWash }]}
                >
                  <Text style={{ color: c.emerald, fontSize: 13, fontWeight: "600" }}>
                    Negotiable
                  </Text>
                </View>
              ) : null}
              {listing.buyerProtection ? (
                <View
                  style={[styles.negoChip, { borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }]}
                >
                  <Text style={{ color: c.muted, fontSize: 12, fontWeight: "600" }}>
                    Buyer Protection
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.title, { color: c.ink }]}>
              {listing.title || "Untitled"}
            </Text>
            <Text style={[styles.meta, { color: c.muted }]}>
              {listing.condition} · {listing.community || "Lagos"}
            </Text>
            {(() => {
              const badge = listing.inspectedBadge;
              const inspected =
                badge === true ||
                (badge &&
                  typeof badge === "object" &&
                  Boolean(badge.inspected));
              const auth =
                listing.authenticationStatus === "PASSED"
                  ? "Authentic ✓"
                  : listing.authRequired ||
                      (listing.authenticationStatus &&
                        listing.authenticationStatus !== "NOT_REQUIRED")
                    ? "Unauthenticated"
                    : null;
              const promo =
                listing.boosted ||
                listing.featured ||
                listing.instantBuyEligible ||
                inspected ||
                auth ||
                listing.certificateId;
              if (!promo) return null;
              return (
                <View style={styles.badgeRow}>
                  {listing.boosted ? (
                    <Text style={styles.promoBadge}>Boosted</Text>
                  ) : null}
                  {listing.featured ? (
                    <Text style={styles.promoBadgeFeatured}>Featured</Text>
                  ) : null}
                  {listing.instantBuyEligible ? (
                    <Text style={styles.instantBuyBadge}>Instant Buy</Text>
                  ) : null}
                  {inspected ? (
                    <Text style={styles.verticalBadge}>Inspected ✓</Text>
                  ) : null}
                  {auth ? (
                    <Text
                      style={
                        auth === "Authentic ✓"
                          ? styles.verticalBadge
                          : styles.verticalBadgeMuted
                      }
                    >
                      {auth}
                    </Text>
                  ) : null}
                  {listing.certificateId ? (
                    <Text style={styles.verticalBadgeMuted}>
                      Cert {listing.certificateId}
                    </Text>
                  ) : null}
                </View>
              );
            })()}
            {listing.movingSale ? (
              <Text style={styles.chip}>
                Moving sale: {listing.movingSale.title}
              </Text>
            ) : null}
            {listing.communityChip ? (
              <Text style={styles.chip}>
                {listing.communityChip.name}
                {listing.communityChip.privacy !== "PUBLIC"
                  ? " · members"
                  : ""}
              </Text>
            ) : null}

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
            <Text style={styles.copy} numberOfLines={descExpanded ? undefined : 2}>
              {listing.description || "No description."}
            </Text>
            {listing.description && listing.description.length > 80 ? (
              <Pressable
                onPress={() => setDescExpanded((v) => !v)}
                accessibilityRole="button"
              >
                <Text style={styles.profileLink}>
                  {descExpanded ? "Less" : "More"}
                </Text>
              </Pressable>
            ) : null}

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
                Propose a swap with one of your live listings
              </Text>
            ) : null}

            {similar.length > 0 ? (
              <View style={styles.similarBlock}>
                <Text style={styles.section}>Similar items</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.similarScroll}
                >
                  {similar.map((item) => {
                    const imgs = [...item.images].sort(
                      (a, b) => a.sortOrder - b.sortOrder,
                    );
                    const src = listingImageUrl(imgs[0]);
                    return (
                      <View key={item.id} style={styles.similarCard}>
                        {src ? (
                          <Image
                            source={{ uri: src }}
                            style={styles.similarImg}
                          />
                        ) : (
                          <View style={[styles.similarImg, styles.similarPh]} />
                        )}
                        <Text numberOfLines={2} style={styles.similarTitle}>
                          {item.title || "Untitled"}
                        </Text>
                        <Text style={styles.similarPrice}>
                          {formatNgnFromKobo(item.priceKobo)}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {toast ? (
              <Pressable onPress={() => setToast(null)}>
                <Text style={styles.toast}>{toast}</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={[styles.stickyBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
            {isOwner ? (
              <Pressable
                style={[styles.stickyPrimary, { backgroundColor: c.emerald, flex: 1 }]}
                onPress={() => setBoostOpen(true)}
                accessibilityRole="button"
              >
                <Text style={styles.stickyPrimaryText}>Boost listing</Text>
              </Pressable>
            ) : isSwap ? (
              <Pressable
                style={[styles.stickyPrimary, { backgroundColor: c.emerald, flex: 1 }]}
                onPress={() => {
                  if (!swapBusy) void openSwapSheet();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.stickyPrimaryText}>
                  {swapBusy ? "…" : "Propose swap"}
                </Text>
              </Pressable>
            ) : isGiveAway ? (
              <Pressable
                style={[styles.stickyPrimary, { backgroundColor: c.emerald, flex: 1 }]}
                onPress={() => {
                  if (!claimBusy) void claimGiveaway();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.stickyPrimaryText}>
                  {claimBusy ? "…" : "Claim this item"}
                </Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={[styles.stickyOutline, { borderColor: c.border }]}
                  onPress={() => {
                    if (!chatBusy) void startChat();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Chat"
                >
                  <Text style={{ color: c.ink, fontWeight: "600" }}>
                    {chatBusy ? "…" : "Chat"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.stickyGhost}
                  onPress={() => {
                    void hapticLight();
                    if (!saving) void toggleSave();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={saved ? "Unsave" : "Save"}
                >
                  <Text style={{ color: saved ? c.emerald : c.ink, fontSize: 18 }}>
                    ♥
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.stickyOutline, { borderColor: c.border, flex: 1 }]}
                  onPress={() => setOfferOpen(true)}
                  accessibilityRole="button"
                >
                  <Text style={{ color: c.ink, fontWeight: "600" }}>Offer</Text>
                </Pressable>
                <Pressable
                  style={[styles.stickyPrimary, { backgroundColor: c.emerald, flex: 1.2 }]}
                  onPress={() => {
                    if (listingId) onBuyNow?.(listingId);
                    else setToast("Coming soon");
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.stickyPrimaryText}>Buy Now</Text>
                </Pressable>
              </>
            )}
          </View>
          </>
        )}

        <BottomSheet
          visible={offerOpen}
          title="Make offer"
          onClose={() => setOfferOpen(false)}
        >
          <Text style={styles.label}>Amount (₦)</Text>
          <TextInput
            style={styles.input}
            value={offerNaira}
            onChangeText={setOfferNaira}
            keyboardType="numeric"
            placeholder="45000"
            accessibilityLabel="Offer amount in naira"
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
        </BottomSheet>

        <Modal visible={swapOpen} animationType="slide" transparent>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Propose a swap</Text>
              {myListings.length === 0 ? (
                <Text style={styles.muted}>
                  You need a live listing to swap. Create one first.
                </Text>
              ) : (
                <>
                  <Text style={styles.label}>Your offer</Text>
                  {myListings.map((l) => (
                    <Pressable
                      key={l.id}
                      style={[
                        styles.pickRow,
                        swapSelected === l.id && styles.pickRowActive,
                      ]}
                      onPress={() => setSwapSelected(l.id)}
                    >
                      <Text style={styles.pickTitle} numberOfLines={1}>
                        {l.title || "Untitled"}
                      </Text>
                      <Text style={styles.muted}>
                        {formatNgnFromKobo(l.priceKobo)}
                      </Text>
                    </Pressable>
                  ))}
                  <Text style={styles.label}>Cash top-up (₦)</Text>
                  <TextInput
                    style={styles.input}
                    value={swapCashNaira}
                    onChangeText={setSwapCashNaira}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <Pressable
                    style={[styles.primaryBtn, swapBusy && styles.disabled]}
                    disabled={swapBusy}
                    onPress={() => void submitSwap()}
                  >
                    <Text style={styles.primaryBtnText}>
                      {swapBusy ? "Sending…" : "Send swap proposal"}
                    </Text>
                  </Pressable>
                </>
              )}
              <Pressable onPress={() => setSwapOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={boostOpen} animationType="slide" transparent>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Boost listing</Text>
              <Text style={styles.muted}>
                More visibility in discovery for a short window.
              </Text>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.durationRow}>
                {BOOST_DURATIONS_HOURS.map((h) => (
                  <Pressable
                    key={h}
                    style={[
                      styles.durationChip,
                      boostHours === h && styles.durationChipActive,
                    ]}
                    onPress={() => setBoostHours(h)}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        boostHours === h && styles.durationChipTextActive,
                      ]}
                    >
                      {h === 168 ? "7 days" : `${h}h`}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.copy}>
                {quoteBusy
                  ? "Getting price…"
                  : boostQuote
                    ? `Price: ${formatNgnFromKobo(boostQuote.priceKobo)}`
                    : "Price unavailable"}
              </Text>
              <Pressable
                style={[
                  styles.primaryBtn,
                  (boostBusy || quoteBusy || !boostQuote) && styles.disabled,
                ]}
                disabled={boostBusy || quoteBusy || !boostQuote}
                onPress={() => void confirmBoost()}
              >
                <Text style={styles.primaryBtnText}>
                  {boostBusy ? "Paying…" : "Confirm & pay"}
                </Text>
              </Pressable>
              {featuredQuote ? (
                <Pressable
                  style={[
                    styles.secondarySheetBtn,
                    boostBusy && styles.disabled,
                  ]}
                  disabled={boostBusy}
                  onPress={() => void confirmFeatured()}
                >
                  <Text style={styles.secondarySheetBtnText}>
                    Feature instead · {formatNgnFromKobo(featuredQuote.priceKobo)}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setBoostOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
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
  body: { paddingBottom: 40 },
  hero: {
    height: 320,
    backgroundColor: "#E5E1DA",
  },
  heroEmpty: { alignItems: "center", justifyContent: "center" },
  counterChip: {
    position: "absolute",
    right: 16,
    bottom: 16,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 28,
    justifyContent: "center",
  },
  priceRow: {
    marginTop: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  negoChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  stickyPrimary: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  stickyPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  stickyOutline: {
    minHeight: 48,
    minWidth: 56,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  stickyGhost: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#101418",
  },
  title: {
    marginTop: 8,
    paddingHorizontal: 20,
    fontSize: 20,
    fontWeight: "600",
    color: "#101418",
  },
  meta: { marginTop: 8, paddingHorizontal: 20, fontSize: 13, color: "#5C6470" },
  section: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
    fontSize: 15,
    fontWeight: "700",
    color: "#101418",
  },
  copy: {
    paddingHorizontal: 20,
    fontSize: 15,
    color: "#101418",
    lineHeight: 22,
  },
  seller: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E1DA",
    backgroundColor: "#FFFFFF",
    gap: 4,
  },
  protect: {
    marginTop: 16,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E1DA",
    backgroundColor: "#FFFFFF",
  },
  similarBlock: { marginTop: 8, paddingLeft: 20 },
  chip: {
    marginTop: 8,
    marginHorizontal: 20,
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#E6F6EF",
    fontSize: 13,
    fontWeight: "600",
    color: "#0E9F6E",
  },
  badgeRow: {
    marginTop: 10,
    marginHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  verticalBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#D1FAE5",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
  },
  instantBuyBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#D1FAE5",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#0E9F6E",
  },
  promoBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  promoBadgeFeatured: {
    alignSelf: "flex-start",
    backgroundColor: "#E0E7FF",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#3730A3",
  },
  verticalBadgeMuted: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E5E2DC",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#5C636A",
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
    color: "#C9A227",
  },
  profileLink: {
    marginTop: 8,
    marginHorizontal: 20,
    fontSize: 14,
    fontWeight: "600",
    color: "#0E9F6E",
  },
  muted: { marginTop: 4, fontSize: 13, color: "#5C6470" },
  protectTitle: { fontSize: 14, fontWeight: "700", color: "#0E9F6E" },
  similarScroll: { marginTop: 10 },
  similarCard: { width: 132, marginRight: 10 },
  similarImg: {
    width: 132,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#E5E1DA",
  },
  similarPh: { backgroundColor: "#E5E1DA" },
  similarTitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#101418",
  },
  similarPrice: { marginTop: 2, fontSize: 13, fontWeight: "700", color: "#101418" },
  centerText: { textAlign: "center", marginTop: 16 },
  actions: { marginTop: 24, gap: 10 },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#E5E1DA",
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
  pickRow: {
    borderWidth: 1,
    borderColor: "#E5E2DC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  pickRowActive: {
    borderColor: "#0E9F6E",
    backgroundColor: "#ECFDF5",
  },
  pickTitle: { fontSize: 15, fontWeight: "600", color: "#111315" },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  durationChip: {
    borderWidth: 1,
    borderColor: "#E5E2DC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  durationChipActive: {
    borderColor: "#0E9F6E",
    backgroundColor: "#ECFDF5",
  },
  durationChipText: { fontSize: 14, fontWeight: "600", color: "#111315" },
  durationChipTextActive: { color: "#047857" },
  secondarySheetBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E2DC",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondarySheetBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111315",
  },
});
