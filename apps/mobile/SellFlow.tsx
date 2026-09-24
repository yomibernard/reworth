import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiError } from "./lib/api";
import { ensureAccessToken, getAccessToken } from "./lib/auth";
import { brandAssets, conditionBadgeSource, HOME_CATEGORIES } from "./lib/brandAssets";
import {
  assistListing,
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
import { colors } from "./theme/tokens";

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
  /** Optional local preview when uri is mock:// */
  preview?: number;
};

type Props = {
  onPublished?: (listing: PublicListing) => void;
  onOpenListing?: (id: string) => void;
};

async function pickImages(): Promise<LocalPhoto[]> {
  try {
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

async function capturePhoto(): Promise<LocalPhoto | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ImagePicker = require("expo-image-picker") as {
      requestCameraPermissionsAsync: () => Promise<{ status: string }>;
      launchCameraAsync: (opts: object) => Promise<{
        canceled: boolean;
        assets?: Array<{
          uri: string;
          fileName?: string | null;
          mimeType?: string | null;
        }>;
      }>;
    };
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const a = result.assets[0];
    return {
      uri: a.uri,
      name: a.fileName ?? `camera-${Date.now()}.jpg`,
      type: a.mimeType ?? "image/jpeg",
    };
  } catch {
    return null;
  }
}

/** Read local / blob photo into base64 for media/complete when PUT fails. */
async function photoToBase64(
  uri: string,
): Promise<string | undefined> {
  if (!uri || uri.startsWith("mock://")) return undefined;
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    if (blob.size > 9 * 1024 * 1024) return undefined;
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          resolve(undefined);
          return;
        }
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

function mockPhotos(): LocalPhoto[] {
  return [
    {
      uri: "mock://photo-1",
      name: "living-room-front.jpg",
      type: "image/jpeg",
      key: "uploads/mock/samsung-tv-front.jpg",
      preview: brandAssets.listingPlaceholder,
    },
    {
      uri: "mock://photo-2",
      name: "living-room-side.jpg",
      type: "image/jpeg",
      key: "uploads/mock/samsung-tv-side.jpg",
      preview: brandAssets.movingSale,
    },
    {
      uri: "mock://photo-3",
      name: "living-room-detail.jpg",
      type: "image/jpeg",
      key: "uploads/mock/living-room-detail.jpg",
      preview: brandAssets.onboarding,
    },
  ];
}

function photoPreviewSource(photo: LocalPhoto) {
  if (photo.preview) return photo.preview;
  if (photo.uri.startsWith("mock://")) return brandAssets.listingPlaceholder;
  return { uri: photo.uri };
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
  const [authRequired, setAuthRequired] = useState(false);
  const [instantBuyEligible, setInstantBuyEligible] = useState(false);
  const [donateIfUnsold, setDonateIfUnsold] = useState(false);
  const [donateDays, setDonateDays] = useState("30");
  const [published, setPublished] = useState<PublicListing | null>(null);
  const [sellerPlan, setSellerPlan] = useState<SellerPlan | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planToast, setPlanToast] = useState<string | null>(null);

  const tokenOrThrow = useCallback(async () => {
    const token = await ensureAccessToken();
    if (!token) {
      throw new Error("Not signed in — open Profile and sign in");
    }
    return token;
  }, []);

  /** Prefer latest access token (after apiFetch auto-refresh). */
  const latestToken = useCallback(async () => {
    return (await ensureAccessToken()) ?? (await tokenOrThrow());
  }, [tokenOrThrow]);

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
      await ensureAccessToken();
      const token = await getAccessToken();
      if (!token) {
        setPlanToast("Sign in to upgrade");
        return;
      }
      await upgradeSellerPlus(token, newIdempotencyKey("seller_plus"));
      await loadSellerPlan();
      setPlanToast("Seller Plus active");
    } catch (err) {
      setPlanToast(
        err instanceof ApiError && err.status === 401
          ? "Session expired — sign in again"
          : "Upgrade failed — try again or contact support",
      );
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
      setError("No photos selected — try camera, gallery, or mock photos.");
      return;
    }
    setPhotos((prev) => [...prev, ...picked].slice(0, 6));
  }

  async function takePhoto() {
    setError(null);
    if (photos.length >= 6) {
      setError("Maximum 6 photos.");
      return;
    }
    const shot = await capturePhoto();
    if (!shot) {
      setError("Camera unavailable — allow camera access or use gallery.");
      return;
    }
    setPhotos((prev) => [...prev, shot].slice(0, 6));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
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
      // Warm / refresh session so short-lived JWTs don't block Analyze
      let token = await latestToken();
      const id = await ensureDraft(token);
      token = await latestToken();
      const keys: { key: string; sortOrder: number }[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        token = await latestToken();
        if (photo.uri.startsWith("mock://") && photo.key) {
          // Mock: complete with key — API seeds placeholder bytes for vision
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
            token = await latestToken();
            await completeMedia(token, id, presign.key, i);
            keys.push({ key: presign.key, sortOrder: i });
          }
          continue;
        }
        const inlineBase64 = await photoToBase64(photo.uri);
        const contentLength = inlineBase64
          ? Math.ceil((inlineBase64.length * 3) / 4)
          : 4096;
        const presign = await presignMedia(
          token,
          id,
          photo.name,
          photo.type,
          Math.max(contentLength, 64),
        );
        let putOk = false;
        try {
          const blobRes = await fetch(photo.uri);
          const blob = await blobRes.blob();
          const putRes = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": photo.type },
            body: blob,
          });
          putOk = putRes.ok;
        } catch {
          /* mock / CORS — fall through to inline */
        }
        token = await latestToken();
        await completeMedia(token, id, presign.key, i, {
          ...(putOk
            ? {}
            : {
                inlineBase64,
                contentType: photo.type,
              }),
        });
        keys.push({ key: presign.key, sortOrder: i });
      }

      setAssistLoading(true);
      setStep("draft");
      token = await latestToken();
      const assist = await assistListing(
        id,
        token,
        keys.map((k) => k.key),
      );
      const refreshed = await getListing(id, await latestToken());
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
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? "Session expired — open Profile, Sign out, then sign in again"
            : err.message
          : err instanceof Error
            ? err.message
            : "Upload failed";
      setError(message);
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
      authRequired,
      instantBuyEligible: sellingMode === "SELL" ? instantBuyEligible : false,
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
      if (donateIfUnsold && sellingMode === "SELL") {
        try {
          const { setDonateIfUnsold } = await import("./lib/circular");
          const days = Math.max(1, Number(donateDays) || 30);
          await setDonateIfUnsold(token, listingId, days);
        } catch {
          /* non-blocking */
        }
      }
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
            Add up to 6 photos. Prefer daylight, fill the frame — Analyze drafts
            the listing from what the camera sees.
          </Text>
          <View style={styles.filmstrip}>
            {Array.from({ length: 6 }).map((_, i) => {
              const photo = photos[i];
              return (
                <View key={i} style={styles.filmSlotWrap}>
                  <Pressable
                    style={[
                      styles.filmSlot,
                      photo ? styles.filmSlotFilled : null,
                    ]}
                    onPress={() => {
                      if (photo) removePhoto(i);
                      else void takePhoto();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      photo
                        ? `Remove photo ${i + 1}`
                        : `Capture photo in slot ${i + 1}`
                    }
                  >
                    {photo ? (
                      <>
                        <Image
                          source={photoPreviewSource(photo)}
                          style={styles.filmSlotImage}
                          resizeMode="cover"
                        />
                        <View style={styles.filmScanLine} pointerEvents="none" />
                        <Text style={styles.filmRemove}>×</Text>
                      </>
                    ) : (
                      <Image
                        source={brandAssets.listingPlaceholder}
                        style={styles.filmSlotEmptyIcon}
                        resizeMode="contain"
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
          <Text style={styles.meta}>{photos.length} / 6 photos</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => void takePhoto()}
            accessibilityRole="button"
            accessibilityLabel="Take photo with camera"
            testID="sell-take-photo"
          >
            <Image
              source={brandAssets.actionSell}
              style={styles.ctaIcon}
              resizeMode="contain"
            />
            <Text style={styles.primaryBtnText}>Take photo</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => void addPhotos()}
            accessibilityRole="button"
            accessibilityLabel="Add from gallery"
            testID="sell-gallery"
          >
            <Image
              source={brandAssets.actionSave}
              style={styles.ctaIconMuted}
              resizeMode="contain"
            />
            <Text style={styles.secondaryBtnText}>Add from gallery</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => void useMockPhotos()}
            accessibilityRole="button"
            accessibilityLabel="Use mock photos"
            testID="sell-mock-photos"
          >
            <Image
              source={brandAssets.movingSale}
              style={styles.ctaIconMuted}
              resizeMode="contain"
            />
            <Text style={styles.secondaryBtnText}>Use mock photos</Text>
          </Pressable>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Pressable
            style={[
              styles.primaryBtn,
              (busy || photos.length < 2) && styles.btnDisabled,
            ]}
            onPress={() => void continuePhotos()}
            disabled={busy || photos.length < 2}
            accessibilityRole="button"
            accessibilityLabel="Analyze photos"
            testID="sell-analyze"
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
              <Text style={styles.label}>Category</Text>
              <View style={styles.chips}>
                {HOME_CATEGORIES.map(({ label, icon }) => {
                  const selected = categoryName === label;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setCategoryName(label)}
                      style={[
                        styles.catChipBtn,
                        selected && styles.catChipSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Image
                        source={brandAssets[icon]}
                        style={styles.catChipIcon}
                        resizeMode="contain"
                      />
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.catChipTextOn,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Field label="Brand" value={brand} onChange={setBrand} />
              <Text style={styles.label}>Condition</Text>
              <View style={styles.chips}>
                {(
                  [
                    ["LIKE_NEW", "Like new"],
                    ["GOOD", "Good"],
                    ["FAIR", "Fair"],
                    ["USED", "Used"],
                  ] as const
                ).map(([value, label]) => {
                  const selected = condition === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setCondition(value)}
                      style={[
                        styles.catChipBtn,
                        selected && styles.catChipSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Image
                        source={conditionBadgeSource(value)}
                        style={styles.catChipIcon}
                        resizeMode="contain"
                      />
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.catChipTextOn,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
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
                  {priceIntel.quickSaleKobo != null ? (
                    <Text style={styles.copy}>
                      Quick sale{" "}
                      {formatNgnFromKobo(priceIntel.quickSaleKobo)}
                      {priceIntel.maxValueKobo != null
                        ? ` · Max ${formatNgnFromKobo(priceIntel.maxValueKobo)}`
                        : ""}
                    </Text>
                  ) : null}
                  {priceIntel.confidenceLabel || priceIntel.sampleCount != null ? (
                    <Text style={styles.copy}>
                      {priceIntel.confidenceLabel ?? "Comps"}
                      {priceIntel.sampleCount != null
                        ? ` · ${priceIntel.sampleCount} samples`
                        : ""}
                    </Text>
                  ) : null}
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() =>
                      setPriceNaira(
                        String(Math.round(priceIntel.recommendedKobo / 100)),
                      )
                    }
                  >
                    <Text style={styles.secondaryBtnText}>
                      Use recommended price
                    </Text>
                  </Pressable>
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
          <Pressable
            style={styles.checkRow}
            onPress={() => setAuthRequired((v) => !v)}
          >
            <Text style={styles.copy}>
              {authRequired ? "☑" : "☐"} Require luxury authentication
            </Text>
          </Pressable>
          {sellingMode === "SELL" ? (
            <>
              <Pressable
                style={styles.checkRow}
                onPress={() => setInstantBuyEligible((v) => !v)}
              >
                <Text style={styles.copy}>
                  {instantBuyEligible ? "☑" : "☐"} Instant Buy eligible
                </Text>
              </Pressable>
              <Pressable
                style={styles.checkRow}
                onPress={() => setDonateIfUnsold((v) => !v)}
              >
                <Text style={styles.copy}>
                  {donateIfUnsold ? "☑" : "☐"} Donate if unsold
                </Text>
              </Pressable>
              {donateIfUnsold ? (
                <TextInput
                  style={styles.input}
                  value={donateDays}
                  onChangeText={setDonateDays}
                  keyboardType="number-pad"
                  placeholder="Days before donate (e.g. 30)"
                  accessibilityLabel="Donate after days"
                />
              ) : null}
            </>
          ) : null}
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
              style={styles.successMark}
              accessibilityLabel="Published successfully"
            >
              <Text style={styles.successMarkText}>✓</Text>
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
    color: colors.ink,
    letterSpacing: -0.4,
  },
  stepHint: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: colors.orange,
  },
  copy: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    color: colors.muted,
  },
  meta: { marginTop: 8, fontSize: 14, color: colors.muted },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  field: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryBtnText: { color: colors.onAccent, fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  ctaIcon: { width: 22, height: 22 },
  ctaIconMuted: { width: 22, height: 22, opacity: 0.9 },
  btnDisabled: { opacity: 0.55 },
  error: { marginTop: 10, color: colors.error, fontSize: 14 },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  flex: { flex: 1 },
  centerBlock: { alignItems: "center", paddingVertical: 40, gap: 12 },
  filmstrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  filmSlotWrap: { position: "relative" },
  filmSlot: {
    width: 72,
    height: 96,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  filmSlotFilled: {
    backgroundColor: colors.beige,
    borderColor: colors.orange,
    borderWidth: 1.5,
  },
  filmSlotImage: {
    width: "100%",
    height: "100%",
  },
  filmSlotEmptyIcon: {
    width: 36,
    height: 36,
    opacity: 0.55,
  },
  filmSlotText: { fontSize: 22, fontWeight: "700", color: colors.orange },
  filmRemove: {
    position: "absolute",
    top: 2,
    right: 4,
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 3,
  },
  filmScanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "42%",
    height: 2,
    backgroundColor: "rgba(217,106,50,0.55)",
  },
  scanBlock: { alignItems: "center", paddingVertical: 32, gap: 16 },
  scanFrame: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.beige,
    overflow: "hidden",
    justifyContent: "center",
  },
  scanLine: {
    height: 3,
    width: "100%",
    backgroundColor: colors.orange,
    opacity: 0.85,
  },
  intel: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  intelTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  intelRec: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
    color: colors.orange,
  },
  modeBtn: {
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeWash,
  },
  modeText: { fontSize: 16, fontWeight: "600", color: colors.ink },
  checkRow: { marginTop: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  chipTextSelected: { color: colors.onAccent },
  catChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  catChipSelected: {
    backgroundColor: colors.beige,
    borderColor: colors.ink,
  },
  catChipIcon: { width: 22, height: 22 },
  catChipTextOn: { color: colors.ink, fontWeight: "700" },
  titlePreview: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
  },
  successMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.beige,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successMarkText: { fontSize: 36, color: colors.orange },
  planCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  planTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  planCopy: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  planBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  planBtnText: { fontSize: 14, fontWeight: "600", color: colors.ink },
  planBtnPrimary: {
    marginTop: 12,
    backgroundColor: colors.orange,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  planBtnPrimaryText: { fontSize: 14, fontWeight: "700", color: colors.onAccent },
  planToast: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: colors.orange,
  },
});
