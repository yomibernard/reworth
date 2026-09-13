import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChatsPanel } from "./ChatScreens";
import { ListingDetailModal } from "./ListingDetailModal";
import {
  CheckoutModal,
  DisputeModal,
  OrderDetailModal,
  OrdersPanel,
} from "./OrdersScreens";
import { SellFlow } from "./SellFlow";
import {
  DiscoveryHome,
  FavouritesPanel,
  SearchPanel,
} from "./DiscoveryScreens";
import { UserProfileModal } from "./UserProfileModal";
import { PrivacySettings } from "./PrivacySettings";
import { apiFetch, ApiError } from "./lib/api";
import {
  clearTokens,
  getAccessToken,
  getOnboardingPhone,
  getRefreshToken,
  isValidNgPhone,
  normalizeNgPhone,
  setOnboardingPhone,
  setTokens,
} from "./lib/auth";
import {
  COMMUNITIES,
  type Community,
  type MeResponse,
} from "./lib/types";

type Tab = "home" | "discover" | "sell" | "chats" | "profile";
type OnboardingStep = "welcome" | "phone" | "otp" | "profile";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "discover", label: "Discover" },
  { id: "sell", label: "SELL" },
  { id: "chats", label: "Chats" },
  { id: "profile", label: "Profile" },
];

export default function App() {
  const [booting, setBooting] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [active, setActive] = useState<Tab>("home");
  const [onboarding, setOnboarding] = useState<OnboardingStep>("welcome");

  const [phone, setPhone] = useState("+234");
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [community, setCommunity] = useState<Community | "">("");
  const [me, setMe] = useState<MeResponse | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugHint, setDebugHint] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [homeSearchOpen, setHomeSearchOpen] = useState(false);
  const [profileSubtab, setProfileSubtab] = useState<
    "account" | "saved" | "orders"
  >("account");
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [checkoutParams, setCheckoutParams] = useState<{
    listingId: string;
    offerId?: string;
    orderIntentId?: string;
  } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setAuthed(false);
      setMe(null);
      return;
    }
    try {
      const profile = await apiFetch<MeResponse>("/me", { token });
      setMe(profile);
      setAuthed(true);
      if (profile.profile?.displayName) {
        setDisplayName(profile.profile.displayName);
      }
      const pref = profile.profile?.preferredCommunity;
      if (pref && (COMMUNITIES as readonly string[]).includes(pref)) {
        setCommunity(pref as Community);
      }
    } catch {
      await clearTokens();
      setAuthed(false);
      setMe(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (token) {
        await refreshMe();
      }
      setBooting(false);
    })();
  }, [refreshMe]);

  useEffect(() => {
    if (active !== "home") setHomeSearchOpen(false);
  }, [active]);

  async function requestOtp() {
    setError(null);
    setDebugHint(null);
    const normalized = normalizeNgPhone(phone);
    if (!isValidNgPhone(normalized)) {
      setError("Enter a valid NG number (+234…)");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; debugCode?: string }>(
        "/auth/otp/request",
        { method: "POST", body: { phone: normalized } },
      );
      await setOnboardingPhone(normalized);
      setPhone(normalized);
      if (res.debugCode) setDebugHint(`Dev code: ${res.debugCode}`);
      setOnboarding("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    const stored = (await getOnboardingPhone()) ?? normalizeNgPhone(phone);
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
      }>("/auth/otp/verify", {
        method: "POST",
        body: {
          phone: stored,
          code,
          device: { name: "ReWorth Mobile", platform: "UNKNOWN" },
        },
      });
      await setTokens(res.accessToken, res.refreshToken);
      // Stay on onboarding until profile is saved (do not set authed yet)
      try {
        const profile = await apiFetch<MeResponse>("/me", {
          token: res.accessToken,
        });
        setMe(profile);
        if (profile.profile?.displayName) {
          setDisplayName(profile.profile.displayName);
        }
        const pref = profile.profile?.preferredCommunity;
        if (pref && (COMMUNITIES as readonly string[]).includes(pref)) {
          setCommunity(pref as Community);
        }
      } catch {
        /* form stays empty */
      }
      setOnboarding("profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setError(null);
    const name = displayName.trim();
    if (!name || !community) {
      setError("Name and community are required");
      return;
    }
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      await apiFetch("/me", {
        method: "PATCH",
        token,
        body: { displayName: name, preferredCommunity: community },
      });
      await refreshMe();
      setAuthed(true);
      setActive("home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    const refreshToken = await getRefreshToken();
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: refreshToken ? { refreshToken } : {},
      });
    } catch {
      /* clear local */
    }
    await clearTokens();
    setAuthed(false);
    setMe(null);
    setOnboarding("welcome");
    setOtp("");
    setError(null);
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#0E9F6E" accessibilityLabel="Loading" />
        </View>
      </SafeAreaView>
    );
  }

  if (!authed) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.onboarding}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand} accessibilityRole="header">
            ReWorth
          </Text>

          {onboarding === "welcome" ? (
            <View>
              <Text style={styles.title}>Welcome</Text>
              <Text style={styles.copy}>
                Sell fast · Local trust · AI listing — Lagos recommerce in
                ~60 seconds.
              </Text>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => setOnboarding("phone")}
                accessibilityRole="button"
                accessibilityLabel="Continue"
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
              </Pressable>
            </View>
          ) : null}

          {onboarding === "phone" ? (
            <View>
              <Text style={styles.title}>Your phone</Text>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                accessibilityLabel="Phone number"
                editable={!loading}
              />
              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              {debugHint ? (
                <Text style={styles.hint} accessibilityLiveRegion="polite">
                  {debugHint}
                </Text>
              ) : null}
              <Pressable
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={() => void requestOtp()}
                disabled={loading}
                accessibilityRole="button"
                accessibilityState={{ busy: loading }}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? "Sending…" : "Send code"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {onboarding === "otp" ? (
            <View>
              <Text style={styles.title}>Enter code</Text>
              <Text style={styles.copy}>6-digit SMS code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="One-time code"
                editable={!loading}
              />
              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              <Pressable
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={() => void verifyOtp()}
                disabled={loading}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? "Verifying…" : "Verify"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setOnboarding("phone")}
                accessibilityRole="button"
              >
                <Text style={styles.link}>Change number</Text>
              </Pressable>
            </View>
          ) : null}

          {onboarding === "profile" ? (
            <View>
              <Text style={styles.title}>Your profile</Text>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                accessibilityLabel="Display name"
                editable={!loading}
              />
              <Text style={styles.label}>Preferred community</Text>
              <View style={styles.chips}>
                {COMMUNITIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCommunity(c)}
                    style={[
                      styles.chip,
                      community === c && styles.chipSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: community === c }}
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
              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              <Pressable
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={() => void saveProfile()}
                disabled={loading}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? "Saving…" : "Done"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.screen} accessibilityRole="summary">
        {active === "profile" ? (
          <>
            <View style={styles.subtabs}>
              <Pressable
                onPress={() => setProfileSubtab("account")}
                style={[
                  styles.subtab,
                  profileSubtab === "account" && styles.subtabActive,
                ]}
              >
                <Text
                  style={[
                    styles.subtabText,
                    profileSubtab === "account" && styles.subtabTextActive,
                  ]}
                >
                  Account
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setProfileSubtab("saved")}
                style={[
                  styles.subtab,
                  profileSubtab === "saved" && styles.subtabActive,
                ]}
              >
                <Text
                  style={[
                    styles.subtabText,
                    profileSubtab === "saved" && styles.subtabTextActive,
                  ]}
                >
                  Saved
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setProfileSubtab("orders")}
                style={[
                  styles.subtab,
                  profileSubtab === "orders" && styles.subtabActive,
                ]}
              >
                <Text
                  style={[
                    styles.subtabText,
                    profileSubtab === "orders" && styles.subtabTextActive,
                  ]}
                >
                  Orders
                </Text>
              </Pressable>
            </View>
            {profileSubtab === "saved" ? (
              <FavouritesPanel onOpenListing={(id) => setDetailId(id)} />
            ) : profileSubtab === "orders" ? (
              <OrdersPanel
                meId={me?.id ?? null}
                onOpenOrder={(id) => setOrderId(id)}
              />
            ) : (
              <ScrollView contentContainerStyle={styles.profilePad}>
                <Text style={styles.brand} accessibilityRole="header">
                  Profile
                </Text>
                <Text style={styles.copy}>
                  {me?.profile?.displayName ?? "Member"}
                  {me?.profile?.preferredCommunity
                    ? ` · ${me.profile.preferredCommunity}`
                    : ""}
                </Text>

                <Text style={styles.sectionLabel}>Verification</Text>
                <View style={styles.badges}>
                  <Badge
                    label="L1 Phone"
                    ok={Boolean(me?.verificationLevels.L1_PHONE)}
                  />
                  <Badge
                    label="L2 Email"
                    ok={Boolean(me?.verificationLevels.L2_EMAIL)}
                  />
                  <Badge
                    label={
                      me?.identityVerifiedBadge
                        ? "L3 Identity Verified ✓"
                        : "L3 Identity"
                    }
                    ok={Boolean(me?.verificationLevels.L3_IDENTITY)}
                  />
                </View>

                <PrivacySettings
                  onDeleted={() => {
                    void signOut();
                  }}
                />

                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => void signOut()}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                >
                  <Text style={styles.secondaryBtnText}>Sign out</Text>
                </Pressable>
              </ScrollView>
            )}
          </>
        ) : active === "sell" ? (
          <SellFlow
            onOpenListing={(id) => setDetailId(id)}
            onPublished={() => setActive("home")}
          />
        ) : active === "home" ? (
          homeSearchOpen ? (
            <SearchPanel
              onOpenListing={(id) => setDetailId(id)}
              onBack={() => setHomeSearchOpen(false)}
            />
          ) : (
            <DiscoveryHome
              community={
                me?.profile?.preferredCommunity || community || undefined
              }
              onOpenSearch={() => setHomeSearchOpen(true)}
              onOpenListing={(id) => setDetailId(id)}
            />
          )
        ) : active === "discover" ? (
          <SearchPanel onOpenListing={(id) => setDetailId(id)} />
        ) : active === "chats" ? (
          <ChatsPanel
            meId={me?.id ?? ""}
            openConversationId={openChatId}
            onConversationOpened={() => setOpenChatId(null)}
            onCheckout={(params) => setCheckoutParams(params)}
          />
        ) : (
          <>
            <Text style={styles.brand} accessibilityRole="header">
              ReWorth
            </Text>
            <Text style={styles.copy}>
              {`${TABS.find((t) => t.id === active)?.label} — coming soon.`}
            </Text>
          </>
        )}
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
              {isSell ? <Text style={styles.sellCaption}>SELL</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <ListingDetailModal
        listingId={detailId}
        onClose={() => setDetailId(null)}
        onOpenChat={(conversationId) => {
          setDetailId(null);
          setOpenChatId(conversationId);
          setActive("chats");
        }}
        onBuyNow={(listingId) => {
          setDetailId(null);
          setCheckoutParams({ listingId });
        }}
        onOpenSeller={(sellerId) => {
          setDetailId(null);
          setProfileUserId(sellerId);
        }}
      />

      <UserProfileModal
        userId={profileUserId}
        meId={me?.id ?? null}
        onClose={() => setProfileUserId(null)}
        onOpenListing={(listingId) => {
          setProfileUserId(null);
          setDetailId(listingId);
        }}
      />

      <CheckoutModal
        params={checkoutParams}
        onClose={() => setCheckoutParams(null)}
        onPaid={(id) => {
          setCheckoutParams(null);
          setOrderId(id);
          setActive("profile");
          setProfileSubtab("orders");
        }}
      />

      <OrderDetailModal
        orderId={orderId}
        meId={me?.id ?? null}
        onClose={() => setOrderId(null)}
        onOpenDispute={(id) => {
          setOrderId(null);
          setDisputeId(id);
        }}
      />

      <DisputeModal
        disputeId={disputeId}
        meId={me?.id ?? null}
        onClose={() => setDisputeId(null)}
      />
    </SafeAreaView>
  );
}

function Badge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View style={[styles.badge, ok ? styles.badgeOk : styles.badgeMuted]}>
      <Text style={[styles.badgeText, ok && styles.badgeTextOk]}>
        {label}
        {ok && !label.includes("✓") ? " ✓" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF9F7",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  onboarding: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  profilePad: {
    paddingBottom: 24,
  },
  brand: {
    fontSize: 40,
    fontWeight: "700",
    color: "#111315",
    letterSpacing: -0.5,
  },
  title: {
    marginTop: 28,
    fontSize: 28,
    fontWeight: "700",
    color: "#111315",
    letterSpacing: -0.3,
  },
  copy: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    color: "#5C636A",
  },
  subtabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  subtab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E2DC",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  subtabActive: {
    backgroundColor: "#0E9F6E",
    borderColor: "#0E9F6E",
  },
  subtabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111315",
  },
  subtabTextActive: {
    color: "#FFFFFF",
  },
  label: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#111315",
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 10,
    fontSize: 15,
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
  otpInput: {
    letterSpacing: 8,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#E5E2DC",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    backgroundColor: "#0E9F6E",
    borderColor: "#0E9F6E",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111315",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: "#0E9F6E",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#E5E2DC",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: {
    color: "#111315",
    fontSize: 15,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  link: {
    marginTop: 16,
    textAlign: "center",
    color: "#0E9F6E",
    fontWeight: "600",
  },
  error: {
    marginTop: 10,
    color: "#DC2626",
    fontSize: 14,
  },
  hint: {
    marginTop: 10,
    color: "#0E9F6E",
    fontSize: 14,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeOk: {
    backgroundColor: "#D1FAE5",
  },
  badgeMuted: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E2DC",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5C636A",
  },
  badgeTextOk: {
    color: "#0E9F6E",
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
  listingRow: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E2DC",
    backgroundColor: "#FFFFFF",
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111315",
  },
  listingMeta: {
    marginTop: 6,
    fontSize: 14,
    color: "#5C636A",
  },
});
