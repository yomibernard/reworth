import { useCallback, useEffect, useState } from "react";
import {
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
  assistListing,
  attachListingImages,
  completeMedia,
  createListing,
  getListing,
  getPriceIntelligence,
  patchListing,
  presignMedia,
  publishListing,
  appealListing,
} from "./lib/listings";
import {
  cancelSellerPlus,
  getSellerPlan,
  newIdempotencyKey,
  upgradeSellerPlus,
  type SellerPlan,
} from "./lib/monetization";
import {
  COMMUNITIES,
  formatNgnFromKobo,
  type Community,
  type PriceIntelligence,
  type PublicListing,
  type SellingModeValue,
} from "./lib/types";

type SellStep =
  | "photos"
  | "draft"
  | "mode"
  | "location"
  | "fulfilment"
  | "publish"
  | "done";

type LocalPhoto = {
  uri: string;
  name: string;
  type: string;
  key?: string;
};

type Props = {
  onPublished?: (listing: PublicListing) => void;
  onOpenListing?: (id: string) => void;
};

async function pickImages(): Promise<LocalPhoto[]> {
  try {
    // Optional dependency — may be missing until pnpm install
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ImagePicker = require("expo-image-picker") as {
      requestMediaLibraryPermissionsAsync: () => Promise<{
        status: string;
      }>;
      launchImageLibraryAsync: (opts: object) => Promise<{
        canceled: boolean;
        assets?: Array<{
          uri: string;
          fileName?: string | null;
          mimeType?: string | null;
          fileSize?: number | null;
        }>;
      }>;
    };
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      return mockPhotos();
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 6,
    });
    if (result.canceled || !result.assets?.length) return [];
    return result.assets.slice(0, 6).map((a, i) => ({
      uri: a.uri,
      name: a.fileName ?? `photo-${i}.jpg`,
      type: a.mimeType ?? "image/jpeg",
    }));
  } catch {
    return mockPhotos();
  }
}

function mockPhotos(): LocalPhoto[] {
  return [
    {
      uri: "mock://photo-1",
      name: "samsung-tv-front.jpg",
      type: "image/jpeg",
      key: "uploads/mock/samsung-tv-front.jpg",
    },
    {
      uri: "mock://photo-2",
      name: "samsung-tv-side.jpg",
      type: "image/jpeg",
      key: "uploads/mock/samsung-tv-side.jpg",
    },
  ];
}

export function SellFlow({ onPublished, onOpenListing }: Props) {
  const [step, setStep] = useState<SellStep>("photos");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [listingId, setListingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assistLoading, setAssistLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [appealBusy, setAppealBusy] = useState(false);
  const [appealOk, setAppealOk] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [categoryName, setCategoryName] = useState("");
  const [priceNaira, setPriceNaira] = useState("");
  const [priceIntel, setPriceIntel] = useState<PriceIntelligence | null>(null);

  const [sellingMode, setSellingMode] = useState<SellingModeValue>("SELL");
  const [negotiable, setNegotiable] = useState(true);
  const [community, setCommunity] = useState<Community | "">("");
  const [fulfilmentPickup, setFulfilmentPickup] = useState(true);
  const [fulfilmentMeet, setFulfilmentMeet] = useState(true);
  const [fulfilmentDelivery, setFulfilmentDelivery] = useState(false);
  const [published, setPublished] = useState<PublicListing | null>(null);
  const [sellerPlan, setSellerPlan] = useState<SellerPlan | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planToast, setPlanToast] = useState<string | null>(null);

  const tokenOrThrow = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("Not signed in");
    return token;
  }, []);

  const loadSellerPlan = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setSellerPlan(null);
        return;
      }
      const plan = await getSellerPlan(token);
      setSellerPlan(plan);
    } catch {
      // Plan load failure must not block listing creation
      setSellerPlan(null);
    }
  }, []);

  useEffect(() => {
    void loadSellerPlan();
  }, [loadSellerPlan]);

  async function onUpgradePlus() {
    setPlanBusy(true);
    setPlanToast(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setPlanToast("Sign in to upgrade");
        return;
      }
      await upgradeSellerPlus(token, newIdempotencyKey("seller_plus"));
      await loadSellerPlan();
      setPlanToast("Seller Plus active");
    } catch {
      setPlanToast("Upgrade failed — try again or contact support");
    } finally {
      setPlanBusy(false);
    }
  }

  async function onCancelPlus() {
    setPlanBusy(true);
    setPlanToast(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setPlanToast("Sign in to manage plan");
        return;
      }
      await cancelSellerPlus(token);
      await loadSellerPlan();
      setPlanToast("Plus cancelled at period end");
    } catch {
      setPlanToast("Cancel failed — try again or contact support");
    } finally {
      setPlanBusy(false);
    }
  }

  async function ensureDraft(token: string) {
    if (listingId) return listingId;
    const created = await createListing(token, {
      title: "",
      description: "",
      sellingMode: "SELL",
      negotiable: true,
    });
    setListingId(created.id);
    return created.id;
  }

  async function addPhotos() {
    setError(null);
    const picked = await pickImages();
    if (!picked.length) {
      setError("No photos selected — try again or use mock photos.");
      return;
    }
    setPhotos((prev) => [...prev, ...picked].slice(0, 6));
  }

  async function useMockPhotos() {
    setPhotos(mockPhotos());
    setError(null);
  }

  async function continuePhotos() {
    setError(null);
    if (photos.length < 2) {
      setError("Add at least 2 photos.");
      return;
    }
    setBusy(true);
    try {
      const token = await tokenOrThrow();
      const id = await ensureDraft(token);
      const keys: { key: string; sortOrder: number }[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (photo.uri.startsWith("mock://") && photo.key) {
          // Mock: skip PUT — complete with key (or presign fresh if rejected)
          try {
            await completeMedia(token, id, photo.key, i);
            keys.push({ key: photo.key, sortOrder: i });
          } catch {
            const presign = await presignMedia(
              token,
              id,
              photo.name,
              photo.type,
              2048,
            );
            await completeMedia(token, id, presign.key, i);
            keys.push({ key: presign.key, sortOrder: i });
          }
          continue;
        }
        const contentLength = 4096;
        const presign = await presignMedia(
          token,
          id,
          photo.name,
          photo.type,
          contentLength,
        );
        try {
          const blobRes = await fetch(photo.uri);
          const blob = await blobRes.blob();
          await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": photo.type },
            body: blob,
          });
        } catch {
          /* mock / CORS — proceed with key */
        }
        keys.push({ key: presign.key, sortOrder: i });
      }

      // Batch attach for analytics when keys were only presigned (not completed)
      const needAttach = keys.filter((k) => !photos[k.sortOrder]?.uri?.startsWith("mock://"));
      if (needAttach.length) {
        try {
          await attachListingImages(id, token, needAttach);
        } catch {
          /* may already be completed */
        }
      }

      setAssistLoading(true);
      setStep("draft");
      const assist = await assistListing(
        id,
        token,
        keys.map((k) => k.key),
      );
      const refreshed = await getListing(id, token);
      setTitle(assist.draft?.title || refreshed.title);
      setDescription(assist.draft?.description || refreshed.description);
      setBrand(assist.draft?.brand || refreshed.brand || "");
      setCondition(assist.draft?.suggestedCondition || refreshed.condition);
      setCategoryName(
        assist.draft?.suggestedCategory || refreshed.category?.name || "",
      );
      setPriceNaira(
        String(
          assist.draft?.suggestedPriceNaira ??
            Math.round(refreshed.priceKobo / 100),
        ),
      );
      try {
        setPriceIntel(await getPriceIntelligence(id));
      } catch {
        setPriceIntel(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
      setStep("photos");
    } finally {
      setAssistLoading(false);
      setBusy(false);
    }
  }

  async function saveFields() {
    if (!listingId) return;
    const token = await tokenOrThrow();
    const naira = Number(priceNaira) || 0;
    await patchListing(listingId, token, {
      title: title.trim(),
      description: description.trim(),
      brand: brand.trim() || undefined,
      condition,
      priceKobo: Math.round(naira * 100),
      negotiable,
      sellingMode,
      community: community || undefined,
      fulfilmentPickup,
      fulfilmentMeet,
      fulfilmentDelivery,
    });
  }

  async function doPublish() {
    setError(null);
    if (!listingId) return;
    setBusy(true);
    try {
      const { hapticMedium, hapticSuccess } = await import("./theme/haptics");
      await hapticMedium();
      await saveFields();
      const token = await tokenOrThrow();
      const live = await publishListing(listingId, token);
      setPublished(live);
      setStep("done");
      await hapticSuccess();
      onPublished?.(live);
    } catch (err) {
      const { hapticError } = await import("./theme/haptics");
      await hapticError();
      setError(err instanceof ApiError ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.brand} accessibilityRole="header">
        Sell
      </Text>
      <Text style={styles.stepHint}>{stepLabel(step)}</Text>

      <View style={styles.planCard}>
        <Text style={styles.planTitle}>
          Seller plan · {sellerPlan?.tier === "PLUS" ? "Plus" : "Starter"}
        </Text>
        <Text style={styles.planCopy}>
          {sellerPlan?.tier === "PLUS"
            ? `Up to ${sellerPlan.maxActiveListings} listings · featured slots & analytics`
            : "Upgrade for more live listings, a featured slot, and analytics."}
        </Text>
        {sellerPlan?.tier === "PLUS" ? (
          <Pressable
            style={[styles.planBtn, planBusy && styles.btnDisabled]}
            disabled={planBusy}
            onPress={() => void onCancelPlus()}
            accessibilityRole="button"
            accessibilityLabel="Cancel Seller Plus"
          >
            <Text style={styles.planBtnText}>
              {planBusy ? "…" : "Cancel Plus"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.planBtnPrimary, planBusy && styles.btnDisabled]}
            disabled={planBusy}
            onPress={() => void onUpgradePlus()}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Seller Plus"
          >
            <Text style={styles.planBtnPrimaryText}>
              {planBusy ? "…" : "Upgrade to Plus"}
            </Text>
          </Pressable>
        )}
        {planToast ? (
          <Pressable onPress={() => setPlanToast(null)}>
            <Text style={styles.planToast}>{planToast}</Text>
          </Pressable>
        ) : null}
      </View>

      {step === "photos" ? (
        <View>
          <Text style={styles.copy}>
            Add up to 6 photos. Tap a slot or Analyze when ready.
          </Text>
          <View style={styles.filmstrip}>
            {Array.from({ length: 6 }).map((_, i) => {
              const photo = photos[i];
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.filmSlot,
                    photo ? styles.filmSlotFilled : null,
                  ]}
                  onPress={() => void addPhotos()}
                  accessibilityRole="button"
                  accessibilityLabel={
                    photo ? `Photo ${i + 1} of ${photos.length}` : `Add photo slot ${i + 1}`
                  }
                >
                  <Text style={styles.filmSlotText}>
                    {photo ? String(i + 1) : "+"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.meta}>{photos.length} / 6 photos</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => void addPhotos()}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Add photos</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => void useMockPhotos()}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Use mock photos</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[
              styles.primaryBtn,
              (busy || photos.length < 2) && styles.btnDisabled,
            ]}
            onPress={() => void continuePhotos()}
            disabled={busy || photos.length < 2}
            accessibilityRole="button"
            accessibilityLabel="Analyze photos"
          >
            <Text style={styles.primaryBtnText}>
              {busy ? "Uploading…" : "Analyze"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {step === "draft" ? (
        <View>
          {assistLoading ? (
            <View style={styles.scanBlock} accessibilityLabel="Reading your photos">
              <View style={styles.scanFrame}>
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.copy}>Reading your photos…</Text>
            </View>
          ) : (
            <>
              <Field label="Title" value={title} onChange={setTitle} />
              <Field
                label="Description"
                value={description}
                onChange={setDescription}
                multiline
              />
              <Field
                label="Category"
                value={categoryName}
                onChange={setCategoryName}
              />
              <Field label="Brand" value={brand} onChange={setBrand} />
              <Field
                label="Condition"
                value={condition}
                onChange={setCondition}
              />
              <Field
                label="Price (₦)"
                value={priceNaira}
                onChange={(t) => setPriceNaira(t.replace(/[^\d]/g, ""))}
                keyboardType="numeric"
              />
              {priceIntel ? (
                <View style={styles.intel}>
                  <Text style={styles.intelTitle}>Lagos price sense</Text>
                  <Text style={styles.copy}>
                    {formatNgnFromKobo(priceIntel.estimatedLowKobo)} –{" "}
                    {formatNgnFromKobo(priceIntel.estimatedHighKobo)}
                  </Text>
                  <Text style={styles.intelRec}>
                    Recommended{" "}
                    {formatNgnFromKobo(priceIntel.recommendedKobo)}
                  </Text>
                </View>
              ) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.row}>
                <Pressable
                  style={[styles.secondaryBtn, styles.flex]}
                  onPress={() => setStep("photos")}
                >
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, styles.flex, busy && styles.btnDisabled]}
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await saveFields();
                      setStep("mode");
                    } catch (err) {
                      setError(
                        err instanceof ApiError ? err.message : "Save failed",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : null}

      {step === "mode" ? (
        <View>
          {(["SELL", "SWAP", "GIVE_AWAY"] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.modeBtn, sellingMode === m && styles.modeSelected]}
              onPress={() => setSellingMode(m)}
            >
              <Text style={styles.modeText}>
                {m === "GIVE_AWAY" ? "Give away" : m === "SWAP" ? "Swap" : "Sell"}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.checkRow}
            onPress={() => setNegotiable((v) => !v)}
          >
            <Text style={styles.copy}>
              {negotiable ? "☑" : "☐"} Negotiable
            </Text>
          </Pressable>
          <View style={styles.row}>
            <Pressable
              style={[styles.secondaryBtn, styles.flex]}
              onPress={() => setStep("draft")}
            >
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, styles.flex]}
              onPress={async () => {
                await saveFields();
                setStep("location");
              }}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === "location" ? (
        <View>
          <View style={styles.chips}>
            {COMMUNITIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCommunity(c)}
                style={[styles.chip, community === c && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    community === c && styles.chipTextSelected,
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.row}>
            <Pressable
              style={[styles.secondaryBtn, styles.flex]}
              onPress={() => setStep("mode")}
            >
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, styles.flex]}
              onPress={async () => {
                if (!community) {
                  setError("Choose a community");
                  return;
                }
                await saveFields();
                setStep("fulfilment");
              }}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === "fulfilment" ? (
        <View>
          <Check
            label="Buyer pickup"
            checked={fulfilmentPickup}
            onToggle={() => setFulfilmentPickup((v) => !v)}
          />
          <Check
            label="Meet point"
            checked={fulfilmentMeet}
            onToggle={() => setFulfilmentMeet((v) => !v)}
          />
          <Check
            label="Delivery (quote at checkout)"
            checked={fulfilmentDelivery}
            onToggle={() => setFulfilmentDelivery((v) => !v)}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.row}>
            <Pressable
              style={[styles.secondaryBtn, styles.flex]}
              onPress={() => setStep("location")}
            >
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, styles.flex]}
              onPress={async () => {
                if (!fulfilmentPickup && !fulfilmentMeet && !fulfilmentDelivery) {
                  setError("Pick at least one option");
                  return;
                }
                await saveFields();
                setStep("publish");
              }}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === "publish" ? (
        <View>
          <Text style={styles.titlePreview}>{title}</Text>
          <Text style={styles.copy}>
            {community} ·{" "}
            {sellingMode === "GIVE_AWAY"
              ? "Give away"
              : sellingMode === "SWAP"
                ? "Swap"
                : formatNgnFromKobo((Number(priceNaira) || 0) * 100)}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.row}>
            <Pressable
              style={[styles.secondaryBtn, styles.flex]}
              onPress={() => setStep("fulfilment")}
            >
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, styles.flex, busy && styles.btnDisabled]}
              onPress={() => void doPublish()}
              disabled={busy}
            >
              <Text style={styles.primaryBtnText}>
                {busy ? "Publishing…" : "Publish"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === "done" && published ? (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          {published.status !== "REJECTED" &&
          published.status !== "UNDER_REVIEW" ? (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#F2E7D5",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
              accessibilityLabel="Published successfully"
            >
              <Text style={{ fontSize: 36, color: "#D96A32" }}>✓</Text>
            </View>
          ) : null}
          <Text style={[styles.titlePreview, { textAlign: "center" }]}>
            {published.status === "REJECTED"
              ? "Listing rejected"
              : published.status === "UNDER_REVIEW"
                ? "Submitted for review"
                : "Your item is live"}
          </Text>
          <Text style={[styles.copy, { textAlign: "center" }]}>
            {published.title}
          </Text>
          {published.status === "REJECTED" ? (
            <View style={{ gap: 8, marginBottom: 12, alignSelf: "stretch" }}>
              <Text style={styles.copy}>
                {(published.moderationReasons?.length
                  ? published.moderationReasons.join("; ")
                  : "Content moderation rejected this listing.") +
                  " You can appeal — our team will review."}
              </Text>
              {appealOk ? (
                <Text style={styles.copy}>Appeal submitted.</Text>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Why should this be allowed?"
                    value={appealReason}
                    onChangeText={setAppealReason}
                    multiline
                  />
                  <Pressable
                    style={[styles.primaryBtn, appealBusy && styles.btnDisabled]}
                    disabled={appealBusy || appealReason.trim().length < 8}
                    onPress={() =>
                      void (async () => {
                        const token = await getAccessToken();
                        if (!token || !published.id) return;
                        setAppealBusy(true);
                        setError(null);
                        try {
                          await appealListing(
                            published.id,
                            token,
                            appealReason.trim(),
                          );
                          setAppealOk(true);
                        } catch (err) {
                          setError(
                            err instanceof ApiError
                              ? err.message
                              : "Appeal failed",
                          );
                        } finally {
                          setAppealBusy(false);
                        }
                      })()
                    }
                  >
                    <Text style={styles.primaryBtnText}>
                      {appealBusy ? "…" : "Submit appeal"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : null}
          <Pressable
            style={[styles.primaryBtn, { alignSelf: "stretch" }]}
            onPress={() => onOpenListing?.(published.id)}
          >
            <Text style={styles.primaryBtnText}>View listing</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { alignSelf: "stretch" }]}
            onPress={() => {
              void (async () => {
                try {
                  const { Share } = await import("react-native");
                  await Share.share({
                    message: `Check out my listing on ReWorth: ${published.title}`,
                  });
                } catch {
                  /* noop */
                }
              })();
            }}
          >
            <Text style={styles.secondaryBtnText}>Share</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { alignSelf: "stretch" }]}
            onPress={() => {
              setStep("photos");
              setPhotos([]);
              setListingId(null);
              setPublished(null);
              setAppealOk(false);
              setAppealReason("");
            }}
          >
            <Text style={styles.secondaryBtnText}>List another</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function stepLabel(step: SellStep): string {
  const map: Record<SellStep, string> = {
    photos: "1 · Photos",
    draft: "2 · AI draft",
    mode: "3 · Mode",
    location: "4 · Location",
    fulfilment: "5 · Fulfilment",
    publish: "6 · Publish",
    done: "Done",
  };
  return map[step];
}

function Field({
  label,
  value,
  onChange,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  multiline?: boolean;
  keyboardType?: "numeric";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function Check({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={styles.checkRow} onPress={onToggle}>
      <Text style={styles.copy}>
        {checked ? "☑" : "☐"} {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { paddingBottom: 40 },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    color: "#172A3A",
    letterSpacing: -0.4,
  },
  stepHint: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#D96A32",
  },
  copy: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    color: "#59636D",
  },
  meta: { marginTop: 8, fontSize: 14, color: "#59636D" },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#172A3A",
  },
  field: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#E4DDD4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#172A3A",
    backgroundColor: "#FFFFFF",
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#D96A32",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E4DDD4",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: { color: "#172A3A", fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.55 },
  error: { marginTop: 10, color: "#C94A3A", fontSize: 14 },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  flex: { flex: 1 },
  centerBlock: { alignItems: "center", paddingVertical: 40, gap: 12 },
  filmstrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  filmSlot: {
    width: 56,
    height: 72,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4DDD4",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  filmSlotFilled: {
    backgroundColor: "#F2E7D5",
    borderColor: "#D96A32",
  },
  filmSlotText: { fontSize: 16, fontWeight: "700", color: "#D96A32" },
  scanBlock: { alignItems: "center", paddingVertical: 32, gap: 16 },
  scanFrame: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: "#F2E7D5",
    overflow: "hidden",
    justifyContent: "center",
  },
  scanLine: {
    height: 3,
    width: "100%",
    backgroundColor: "#D96A32",
    opacity: 0.85,
  },
  intel: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4DDD4",
    backgroundColor: "#FFFFFF",
  },
  intelTitle: { fontSize: 14, fontWeight: "700", color: "#172A3A" },
  intelRec: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
    color: "#D96A32",
  },
  modeBtn: {
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4DDD4",
    backgroundColor: "#FFFFFF",
  },
  modeSelected: {
    borderColor: "#D96A32",
    backgroundColor: "#E4F0EA",
  },
  modeText: { fontSize: 16, fontWeight: "600", color: "#172A3A" },
  checkRow: { marginTop: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: {
    borderWidth: 1,
    borderColor: "#E4DDD4",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  chipSelected: { backgroundColor: "#D96A32", borderColor: "#D96A32" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#172A3A" },
  chipTextSelected: { color: "#FFFFFF" },
  titlePreview: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "700",
    color: "#172A3A",
  },
  planCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4DDD4",
    backgroundColor: "#FFFFFF",
  },
  planTitle: { fontSize: 15, fontWeight: "700", color: "#172A3A" },
  planCopy: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#59636D",
  },
  planBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E4DDD4",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  planBtnText: { fontSize: 14, fontWeight: "600", color: "#172A3A" },
  planBtnPrimary: {
    marginTop: 12,
    backgroundColor: "#D96A32",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  planBtnPrimaryText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  planToast: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#D96A32",
  },
});
