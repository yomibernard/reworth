import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import { StatusBar } from "expo-status-bar";
import { parseDeepLink } from "./lib/notifications";
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
import { NotificationsModal } from "./NotificationsScreens";
import {
  PlatformToolsModal,
  SharedBundleModal,
  type PlatformTool,
} from "./PlatformTools";
import { SellerAnalyticsPanel } from "./SellerAnalyticsPanel";
import { OnboardingFlow } from "./OnboardingFlow";
import { CommunitiesModal } from "./CommunitiesScreens";
import { MovingSalesModal } from "./MovingSalesScreens";
import { ReferralsModal } from "./ReferralsScreens";
import { ProSellerModal } from "./ProSellerScreens";
import { StorefrontModal } from "./StorefrontModal";
import { CorporateModal } from "./CorporateScreens";
import { PartnerConsoleModal } from "./PartnerScreens";
import { apiFetch, ApiError } from "./lib/api";
import {
  clearTokens,
  ensureAccessToken,
  getAccessToken,
  getRefreshToken,
} from "./lib/auth";
import { registerDevicePushToken, setupPushListeners } from "./lib/push";
import {
  communityLabelsForCity,
  getPreferredCityKey,
  listRegions,
  setPreferredCityKey,
  type RegionCity,
} from "./lib/region";
import type { SearchFilters } from "./lib/discovery";
import {
  COMMUNITIES,
  type Community,
  type MeResponse,
} from "./lib/types";
import { BottomNav } from "./components/BottomNav";
import { brandAssets } from "./lib/brandAssets";
import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
import { colors } from "./theme/tokens";

type Tab = "home" | "discover" | "sell" | "chats" | "profile";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "discover", label: "Discover" },
  { id: "sell", label: "SELL" },
  { id: "chats", label: "Chats" },
  { id: "profile", label: "Profile" },
];

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const [booting, setBooting] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [active, setActive] = useState<Tab>("home");

  const [displayName, setDisplayName] = useState("");
  const [community, setCommunity] = useState<Community | "">("");
  const [bio, setBio] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [homeSearchOpen, setHomeSearchOpen] = useState(false);
  const [platformTool, setPlatformTool] = useState<PlatformTool>(null);
  const [cityLabel, setCityLabel] = useState("Lagos");
  const [cityKey, setCityKey] = useState("lagos");
  const [cities, setCities] = useState<RegionCity[]>([]);
  const [profileSubtab, setProfileSubtab] = useState<
    "account" | "saved" | "orders" | "stats"
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [communitiesOpen, setCommunitiesOpen] = useState(false);
  const [communityFocusId, setCommunityFocusId] = useState<string | null>(null);
  const [movingSalesOpen, setMovingSalesOpen] = useState(false);
  const [movingSaleFocusId, setMovingSaleFocusId] = useState<string | null>(
    null,
  );
  const [referralsOpen, setReferralsOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [corporateOpen, setCorporateOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState<SearchFilters | null>(null);
  const [bundleShareToken, setBundleShareToken] = useState<string | null>(
    null,
  );
  const [storefrontHandle, setStorefrontHandle] = useState<string | null>(
    null,
  );

  useEffect(() => {
    function handleUrl(url: string | null) {
      if (!url) return;
      const parsed = parseDeepLink(url);
      if (parsed?.kind === "order" && parsed.id) setOrderId(parsed.id);
      else if (parsed?.kind === "dispute" && parsed.id) setDisputeId(parsed.id);
      else if (parsed?.kind === "chat" && parsed.id) {
        setOpenChatId(parsed.id);
        setActive("chats");
      } else if (parsed?.kind === "listing" && parsed.id) setDetailId(parsed.id);
      else if (parsed?.kind === "moving_sale" && parsed.id) {
        setMovingSaleFocusId(parsed.id);
        setMovingSalesOpen(true);
      }       else if (parsed?.kind === "community" && parsed.id) {
        setCommunityFocusId(parsed.id);
        setCommunitiesOpen(true);
      } else if (parsed?.kind === "bundle" && parsed.id) {
        setBundleShareToken(parsed.id);
      } else if (parsed?.kind === "storefront" && parsed.id) {
        setStorefrontHandle(parsed.id);
      }
    }
    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return setupPushListeners((route) => {
      if (route.kind === "order") setOrderId(route.id);
      else if (route.kind === "dispute") setDisputeId(route.id);
      else if (route.kind === "chat") {
        setOpenChatId(route.id);
        setActive("chats");
      } else if (route.kind === "listing") setDetailId(route.id);
      else if (route.kind === "moving_sale") {
        setMovingSaleFocusId(route.id);
        setMovingSalesOpen(true);
      }       else if (route.kind === "community") {
        setCommunityFocusId(route.id);
        setCommunitiesOpen(true);
      } else if (route.kind === "bundle") {
        setBundleShareToken(route.id);
      } else if (route.kind === "storefront") {
        setStorefrontHandle(route.id);
      }
    });
  }, []);

  const refreshMe = useCallback(async () => {
    const token = await ensureAccessToken();
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
      if (profile.profile?.bio) setBio(profile.profile.bio);
      const pref = profile.profile?.preferredCommunity;
      if (pref && (COMMUNITIES as readonly string[]).includes(pref)) {
        setCommunity(pref as Community);
      }
    } catch (err) {
      // Only wipe session on hard auth failure — keep tokens on network blips.
      if (err instanceof ApiError && err.status === 401) {
        await clearTokens();
        setAuthed(false);
        setMe(null);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await ensureAccessToken();
      if (token) {
        await refreshMe();
      }
      setBooting(false);
    })();
  }, [refreshMe]);

  // Quiet re-auth while app is open so short sessions don't surprise the user.
  useEffect(() => {
    if (!authed) return;
    const id = setInterval(() => {
      void ensureAccessToken().then((t) => {
        if (t) void refreshMe();
      });
    }, 20 * 60_000);
    return () => clearInterval(id);
  }, [authed, refreshMe]);

  useEffect(() => {
    void (async () => {
      try {
        const [items, saved] = await Promise.all([
          listRegions(),
          getPreferredCityKey(),
        ]);
        setCities(items);
        const match =
          items.find((c) => c.city === saved) ??
          items.find((c) => c.city === "lagos") ??
          items[0];
        if (match) {
          setCityKey(match.city);
          setCityLabel(match.displayName);
        }
      } catch {
        /* keep Lagos defaults */
      }
    })();
  }, []);

  const profileCommunities = communityLabelsForCity(cityKey);

  useEffect(() => {
    if (!authed) return;
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        await registerDevicePushToken(token);
      } catch {
        /* push optional until store credentials exist */
      }
    })();
  }, [authed]);

  useEffect(() => {
    if (active !== "home") setHomeSearchOpen(false);
  }, [active]);

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
        body: {
          displayName: name,
          preferredCommunity: community,
          bio: bio.trim() || null,
        },
      });
      await refreshMe();
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
    setError(null);
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator
            color={colors.orange}
            accessibilityLabel="Loading"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!authed) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
        <StatusBar style="dark" />
        <OnboardingFlow
          onComplete={(profile) => {
            setMe(profile);
            if (profile.profile?.displayName) {
              setDisplayName(profile.profile.displayName);
            }
            if (profile.profile?.bio) setBio(profile.profile.bio);
            const pref = profile.profile?.preferredCommunity;
            if (pref && (COMMUNITIES as readonly string[]).includes(pref)) {
              setCommunity(pref as Community);
            }
            setAuthed(true);
            setActive("home");
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View
        style={[
          styles.screen,
          (active === "home" ||
            active === "discover" ||
            active === "sell" ||
            active === "chats") &&
            styles.screenFlush,
        ]}
        accessibilityRole="summary"
      >
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
              <Pressable
                onPress={() => setProfileSubtab("stats")}
                style={[
                  styles.subtab,
                  profileSubtab === "stats" && styles.subtabActive,
                ]}
              >
                <Text
                  style={[
                    styles.subtabText,
                    profileSubtab === "stats" && styles.subtabTextActive,
                  ]}
                >
                  Stats
                </Text>
              </Pressable>
            </View>
            {profileSubtab === "saved" ? (
              <FavouritesPanel
                onOpenListing={(id) => setDetailId(id)}
                onBrowse={() => {
                  setProfileSubtab("account");
                  setActive("home");
                }}
                onOpenSearch={(filters) => {
                  setSearchSeed(filters ?? null);
                  setProfileSubtab("account");
                  setActive("discover");
                }}
              />
            ) : profileSubtab === "orders" ? (
              <OrdersPanel
                meId={me?.id ?? null}
                onOpenOrder={(id) => setOrderId(id)}
              />
            ) : profileSubtab === "stats" ? (
              <SellerAnalyticsPanel
                city={cityLabel}
                onOpenListing={(id) => setDetailId(id)}
                onSell={() => setActive("sell")}
              />
            ) : (
              <ScrollView contentContainerStyle={styles.profilePad}>
                <View style={styles.profileHero} accessibilityRole="header">
                  <Image
                    source={brandAssets.logo}
                    style={styles.profileLogo}
                    resizeMode="contain"
                    accessibilityLabel="ReWorth"
                  />
                  <View style={styles.profileHeroRow}>
                    <Image
                      source={brandAssets.profileAvatar}
                      style={styles.profileAvatar}
                      resizeMode="cover"
                      accessibilityIgnoresInvertColors
                    />
                    <View style={styles.profileHeroText}>
                      <Text style={styles.profileName}>
                        {me?.profile?.displayName ?? "Member"}
                      </Text>
                      <Text style={styles.copy}>
                        {me?.profile?.preferredCommunity
                          ? me.profile.preferredCommunity
                          : cityLabel}
                        {me?.identityVerifiedBadge ? " · Verified" : ""}
                      </Text>
                    </View>
                    {me?.identityVerifiedBadge ? (
                      <Image
                        source={brandAssets.verified}
                        style={styles.profileVerified}
                        resizeMode="contain"
                        accessibilityLabel="Verified"
                      />
                    ) : null}
                  </View>
                </View>

                <View
                  style={styles.profileTrustRow}
                  accessibilityLabel="Trust signals"
                >
                  {(
                    [
                      ["Buyer protection", brandAssets.trustBuyerProtection],
                      ["Secure payment", brandAssets.trustSecurePayment],
                      ["Safe meetup", brandAssets.trustSafeMeetup],
                      ["Verified", brandAssets.verifiedSeller],
                    ] as const
                  ).map(([label, icon]) => (
                    <View key={label} style={styles.profileTrustChip}>
                      <Image
                        source={icon}
                        style={styles.profileTrustIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.profileTrustLabel} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.label}>Display name</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  accessibilityLabel="Display name"
                />
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, { minHeight: 72 }]}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  accessibilityLabel="Bio"
                />
                <View style={styles.sectionHead}>
                  <Image
                    source={brandAssets.actionLocation}
                    style={styles.sectionIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.sectionLabelInline}>City (pilot)</Text>
                </View>
                <View style={styles.chips}>
                  {(cities.length ? cities : [
                    { city: "lagos", key: "lagos", displayName: "Lagos" },
                    { city: "abuja", key: "abuja", displayName: "Abuja" },
                  ]).map((c) => (
                    <Pressable
                      key={c.city}
                      onPress={() => {
                        setCityKey(c.city);
                        setCityLabel(c.displayName);
                        void setPreferredCityKey(c.city);
                        if (
                          community &&
                          !communityLabelsForCity(c.city).includes(community)
                        ) {
                          setCommunity("");
                        }
                      }}
                      style={[
                        styles.chip,
                        cityKey === c.city && styles.chipSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: cityKey === c.city }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          cityKey === c.city && styles.chipTextSelected,
                        ]}
                      >
                        {c.displayName}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Preferred community</Text>
                <View style={styles.chips}>
                  {profileCommunities.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCommunity(c as Community)}
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
                    {loading ? "Saving…" : "Save profile"}
                  </Text>
                </Pressable>

                <View style={styles.profileMenu}>
                  <ProfileMenuRow
                    icon={brandAssets.actionChat}
                    label="Notifications"
                    onPress={() => setNotificationsOpen(true)}
                  />
                  <ProfileMenuRow
                    icon={brandAssets.communityNeighbourhood}
                    label="Communities"
                    onPress={() => {
                      setCommunityFocusId(null);
                      setCommunitiesOpen(true);
                    }}
                  />
                  <ProfileMenuRow
                    icon={brandAssets.movingSale}
                    label="Moving sales"
                    onPress={() => {
                      setMovingSaleFocusId(null);
                      setMovingSalesOpen(true);
                    }}
                  />
                  <ProfileMenuRow
                    icon={brandAssets.invite}
                    label="Referrals"
                    onPress={() => setReferralsOpen(true)}
                  />
                  <ProfileMenuRow
                    icon={brandAssets.verifiedSeller}
                    label="Pro seller"
                    onPress={() => setProOpen(true)}
                  />
                  <ProfileMenuRow
                    icon={brandAssets.communityCorporate}
                    label="Corporate relocation"
                    onPress={() => setCorporateOpen(true)}
                  />
                  <ProfileMenuRow
                    icon={brandAssets.communityOffice}
                    label="Partner console"
                    onPress={() => setPartnerOpen(true)}
                  />
                </View>

                <View style={styles.sectionHead}>
                  <Image
                    source={brandAssets.trustIdentityChecked}
                    style={styles.sectionIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.sectionLabelInline}>Verification</Text>
                </View>
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

                <ThemeToggleButton />

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
              initialFilters={searchSeed}
              onNeedAuth={() => setAuthed(false)}
            />
          ) : (
            <DiscoveryHome
              community={
                me?.profile?.preferredCommunity || community || undefined
              }
              cityLabel={cityLabel}
              cityKey={cityKey}
              cities={cities}
              onChangeCity={(city) => {
                setCityKey(city.city);
                setCityLabel(city.displayName);
                void setPreferredCityKey(city.city);
                if (
                  community &&
                  !communityLabelsForCity(city.city).includes(community)
                ) {
                  setCommunity("");
                }
              }}
              onOpenSearch={() => setHomeSearchOpen(true)}
              onOpenListing={(id) => setDetailId(id)}
              onOpenTool={(tool) => setPlatformTool(tool)}
              onSell={() => setActive("sell")}
              onOpenMovingSales={(id) => {
                setMovingSaleFocusId(id ?? null);
                setMovingSalesOpen(true);
              }}
              onOpenCommunities={(id) => {
                setCommunityFocusId(id ?? null);
                setCommunitiesOpen(true);
              }}
            />
          )
        ) : active === "discover" ? (
          <SearchPanel
            onOpenListing={(id) => setDetailId(id)}
            initialFilters={searchSeed}
            onNeedAuth={() => setAuthed(false)}
          />
        ) : active === "chats" ? (
          <ChatsPanel
            meId={me?.id ?? ""}
            openConversationId={openChatId}
            onConversationOpened={() => setOpenChatId(null)}
            onCheckout={(params) => setCheckoutParams(params)}
            onBrowse={() => setActive("home")}
            onSessionExpired={() => {
              setAuthed(false);
              setMe(null);
              setActive("home");
            }}
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

      <BottomNav active={active} onChange={setActive} />

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

      <PlatformToolsModal
        tool={platformTool}
        city={cityLabel}
        onClose={() => setPlatformTool(null)}
        onOpenListing={(id) => {
          setPlatformTool(null);
          setDetailId(id);
        }}
      />

      <SharedBundleModal
        shareToken={bundleShareToken}
        onClose={() => setBundleShareToken(null)}
        onOpenListing={(id) => {
          setBundleShareToken(null);
          setDetailId(id);
        }}
        onNeedAuth={() => {
          setBundleShareToken(null);
          setAuthed(false);
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

      <NotificationsModal
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onOpenOrder={(id) => {
          setNotificationsOpen(false);
          setOrderId(id);
        }}
        onOpenDispute={(id) => {
          setNotificationsOpen(false);
          setDisputeId(id);
        }}
        onOpenChat={(id) => {
          setNotificationsOpen(false);
          setOpenChatId(id);
          setActive("chats");
        }}
        onOpenListing={(id) => {
          setNotificationsOpen(false);
          setDetailId(id);
        }}
      />

      <CommunitiesModal
        visible={communitiesOpen}
        initialSlugOrId={communityFocusId}
        onClose={() => {
          setCommunitiesOpen(false);
          setCommunityFocusId(null);
        }}
        onOpenListing={(id) => {
          setCommunitiesOpen(false);
          setDetailId(id);
        }}
        onNeedAuth={() => {
          setCommunitiesOpen(false);
          setAuthed(false);
        }}
      />

      <MovingSalesModal
        visible={movingSalesOpen}
        initialId={movingSaleFocusId}
        onClose={() => {
          setMovingSalesOpen(false);
          setMovingSaleFocusId(null);
        }}
        onOpenListing={(id) => {
          setMovingSalesOpen(false);
          setDetailId(id);
        }}
        onNeedAuth={() => {
          setMovingSalesOpen(false);
          setAuthed(false);
        }}
        onSell={() => {
          setMovingSalesOpen(false);
          setActive("sell");
        }}
      />

      <ReferralsModal
        visible={referralsOpen}
        onClose={() => setReferralsOpen(false)}
        onNeedAuth={() => {
          setReferralsOpen(false);
          setAuthed(false);
        }}
      />

      <ProSellerModal
        visible={proOpen}
        onClose={() => setProOpen(false)}
        onNeedAuth={() => {
          setProOpen(false);
          setAuthed(false);
        }}
        onOpenStorefront={(handle) => {
          setProOpen(false);
          setStorefrontHandle(handle);
        }}
      />

      <CorporateModal
        visible={corporateOpen}
        onClose={() => setCorporateOpen(false)}
        onNeedAuth={() => {
          setCorporateOpen(false);
          setAuthed(false);
        }}
      />

      <PartnerConsoleModal
        visible={partnerOpen}
        onClose={() => setPartnerOpen(false)}
        onNeedAuth={() => {
          setPartnerOpen(false);
          setAuthed(false);
        }}
      />

      <StorefrontModal
        handle={storefrontHandle}
        onClose={() => setStorefrontHandle(null)}
        onOpenListing={(id) => {
          setStorefrontHandle(null);
          setDetailId(id);
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

function ProfileMenuRow({
  icon,
  label,
  onPress,
}: {
  icon: ImageSourcePropType;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.profileMenuRow,
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Image source={icon} style={styles.profileMenuIcon} resizeMode="contain" />
      <Text style={styles.profileMenuLabel}>{label}</Text>
      <Text style={styles.profileMenuChevron}>›</Text>
    </Pressable>
  );
}

function ThemeToggleButton() {
  const { resolved, toggle } = useTheme();
  return (
    <Pressable
      style={styles.secondaryBtn}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
    >
      <Text style={styles.secondaryBtnText}>
        {resolved === "dark" ? "Light mode" : "Dark mode"}
      </Text>
    </Pressable>
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
    backgroundColor: colors.canvas,
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
    paddingTop: 16,
  },
  screenFlush: {
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  profilePad: {
    paddingBottom: 24,
  },
  profileHero: {
    marginBottom: 8,
  },
  profileLogo: {
    width: 132,
    height: 36,
    marginBottom: 16,
  },
  profileHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.border,
  },
  profileHeroText: {
    flex: 1,
  },
  profileName: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  profileVerified: {
    width: 28,
    height: 28,
  },
  profileTrustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
    marginBottom: 4,
  },
  profileTrustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: "48%",
  },
  profileTrustIcon: {
    width: 18,
    height: 18,
  },
  profileTrustLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    flexShrink: 1,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    marginBottom: 10,
  },
  sectionIcon: {
    width: 22,
    height: 22,
  },
  sectionLabelInline: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  profileMenu: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  profileMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  profileMenuIcon: {
    width: 28,
    height: 28,
  },
  profileMenuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },
  profileMenuChevron: {
    fontSize: 22,
    color: colors.disabled,
    fontWeight: "500",
  },
  brand: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  title: {
    marginTop: 28,
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  copy: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    color: colors.muted,
  },
  subtabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  subtab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  subtabActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  subtabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  subtabTextActive: {
    color: colors.onAccent,
  },
  label: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
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
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.onAccent,
  },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  link: {
    marginTop: 16,
    textAlign: "center",
    color: colors.orange,
    fontWeight: "600",
  },
  error: {
    marginTop: 10,
    color: colors.error,
    fontSize: 14,
  },
  hint: {
    marginTop: 10,
    color: colors.orange,
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
    backgroundColor: colors.orangeWash,
  },
  badgeMuted: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  badgeTextOk: {
    color: colors.orange,
  },
  nav: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
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
    color: colors.muted,
  },
  tabLabelActive: {
    color: colors.orange,
  },
  sellTab: {
    marginTop: -22,
    width: 56,
    height: 56,
    flex: 0,
    borderRadius: 28,
    backgroundColor: colors.orange,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.orange,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sellLabel: {
    color: colors.onAccent,
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
    color: colors.orange,
  },
  listingRow: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  listingMeta: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted,
  },
});
