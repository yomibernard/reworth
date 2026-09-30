/**
 * Design Elevation — consumer onboarding (phone OR email) + profile customize.
 * Mobile-first; tokens from theme/tokens.ts.
 */

import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ApiError, apiFetch } from "./lib/api";
import {
  isValidNgPhone,
  normalizeNgPhone,
  setOnboardingPhone,
  setTokens,
} from "./lib/auth";
import { completeOAuth, type OAuthProvider } from "./lib/oauth";
import {
  COMMUNITIES,
  type Community,
  type MeResponse,
} from "./lib/types";
import { brandAssets } from "./lib/brandAssets";
import { colors, radius, space, tap, type as typeScale } from "./theme/tokens";
import { hapticLight } from "./theme/haptics";

type Step =
  | "welcome"
  | "method"
  | "phone"
  | "otp"
  | "email"
  | "profile";

type Props = {
  onComplete: (me: MeResponse) => void;
};

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [phone, setPhone] = useState("+234");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"register" | "login">("register");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [community, setCommunity] = useState<Community | "">("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugHint, setDebugHint] = useState<string | null>(null);
  const [welcomeSlide, setWelcomeSlide] = useState(0);

  useEffect(() => {
    setError(null);
  }, [step]);

  async function requestOtp() {
    setError(null);
    const normalized = normalizeNgPhone(phone);
    if (!isValidNgPhone(normalized)) {
      setError("Enter a valid Nigerian mobile (+234…)");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        debugCode?: string;
      }>("/auth/otp/request", {
        method: "POST",
        body: { phone: normalized },
      });
      await setOnboardingPhone(normalized);
      setDebugHint(res.debugCode ? `Dev code: ${res.debugCode}` : null);
      setStep("otp");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 429
            ? "Too many codes sent — wait a few minutes, or sign in with email."
            : err.message
          : "Could not send code";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    const code = otp.replace(/\D/g, "");
    if (code.length < 4) {
      setError("Enter the SMS code");
      return;
    }
    const normalized = normalizeNgPhone(phone);
    setLoading(true);
    try {
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        userId: string;
      }>("/auth/otp/verify", {
        method: "POST",
        body: {
          phone: normalized,
          code,
          device: { name: "ReWorth Mobile", platform: "IOS" },
        },
      });
      await setTokens(res.accessToken, res.refreshToken);
      setAccessToken(res.accessToken);
      const me = await apiFetch<MeResponse>("/me", { token: res.accessToken });
      if (me.profile?.displayName) setDisplayName(me.profile.displayName);
      const pref = me.profile?.preferredCommunity;
      if (pref && (COMMUNITIES as readonly string[]).includes(pref)) {
        setCommunity(pref as Community);
      }
      setStep("profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function submitEmail() {
    setError(null);
    const em = email.trim().toLowerCase();
    if (!em.includes("@") || password.length < 8) {
      setError("Email and password (min 8 characters) required");
      return;
    }
    setLoading(true);
    try {
      const path =
        emailMode === "register" ? "/auth/register" : "/auth/login";
      const body =
        emailMode === "register"
          ? {
              email: em,
              password,
              displayName: displayName.trim() || em.split("@")[0],
              device: { name: "ReWorth Mobile", platform: "IOS" },
            }
          : {
              email: em,
              password,
              device: { name: "ReWorth Mobile", platform: "IOS" },
            };
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        userId: string;
      }>(path, { method: "POST", body });
      await setTokens(res.accessToken, res.refreshToken);
      setAccessToken(res.accessToken);
      const me = await apiFetch<MeResponse>("/me", { token: res.accessToken });
      if (me.profile?.displayName) setDisplayName(me.profile.displayName);
      if (me.profile?.bio) setBio(me.profile.bio);
      if (me.profile?.avatarUrl) setAvatarUrl(me.profile.avatarUrl);
      const pref = me.profile?.preferredCommunity;
      if (pref && (COMMUNITIES as readonly string[]).includes(pref)) {
        setCommunity(pref as Community);
      }
      setStep("profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  async function continueWithOAuth(provider: OAuthProvider) {
    setError(null);
    setLoading(true);
    void hapticLight();
    try {
      const res = await completeOAuth(provider);
      setAccessToken(res.accessToken);
      const me = await apiFetch<MeResponse>("/me", { token: res.accessToken });
      if (me.profile?.displayName) setDisplayName(me.profile.displayName);
      if (me.profile?.bio) setBio(me.profile.bio);
      if (me.profile?.avatarUrl) setAvatarUrl(me.profile.avatarUrl);
      const pref = me.profile?.preferredCommunity;
      if (pref && (COMMUNITIES as readonly string[]).includes(pref)) {
        setCommunity(pref as Community);
      }
      setStep("profile");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : provider === "google"
            ? "Google sign-in failed"
            : "Apple sign-in failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo library permission needed for avatar");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    // Local URI stored until profile save — API accepts avatarUrl string.
    // For elevation MVP we use a data-less public placeholder keyed by asset.
    setAvatarUrl(result.assets[0].uri);
  }

  async function saveProfile() {
    setError(null);
    const name = displayName.trim();
    if (!name || !community) {
      setError("Name and community are required");
      return;
    }
    const token = accessToken;
    if (!token) {
      setError("Session missing — start again");
      return;
    }
    setLoading(true);
    try {
      // Prefer remote avatar when already http(s); skip file:// until upload wired.
      const remoteAvatar =
        avatarUrl && /^https?:\/\//i.test(avatarUrl) ? avatarUrl : undefined;
      const me = await apiFetch<MeResponse>("/me", {
        method: "PATCH",
        token,
        body: {
          displayName: name,
          preferredCommunity: community,
          bio: bio.trim() || null,
          ...(remoteAvatar ? { avatarUrl: remoteAvatar } : {}),
        },
      });
      onComplete(me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  const slides = [
    {
      title: "Good things find new homes.",
      line: "Sell what you don’t need — photo to live listing in Lagos.",
      image: brandAssets.onboarding,
    },
    {
      title: "Buy with local trust",
      line: "Verified neighbours. Buyer protection on every deal.",
      image: brandAssets.movingSale,
    },
    {
      title: "Swap or give away",
      line: "Your unused things are worth something.",
      image: brandAssets.invite,
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      keyboardShouldPersistTaps="handled"
    >
      <Image
        source={brandAssets.logo}
        style={styles.brandLogo}
        resizeMode="contain"
        accessibilityLabel="ReWorth"
      />

      {step === "welcome" ? (
        <View>
          <View style={styles.welcomeHero}>
            <Image
              source={slides[welcomeSlide].image}
              style={styles.welcomeImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>{slides[welcomeSlide].title}</Text>
          <Text style={styles.copy}>{slides[welcomeSlide].line}</Text>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setWelcomeSlide(i)}
                accessibilityRole="button"
                accessibilityLabel={`Slide ${i + 1}`}
                hitSlop={8}
                style={[styles.dot, i === welcomeSlide && styles.dotOn]}
              />
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={() => {
              void hapticLight();
              if (welcomeSlide < slides.length - 1) {
                setWelcomeSlide((s) => s + 1);
              } else {
                setStep("method");
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.primaryBtnText}>
              {welcomeSlide < slides.length - 1 ? "Next" : "Get started"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void hapticLight();
              setStep("method");
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.link}>Skip</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "method" ? (
        <View>
          <View style={styles.stepHero}>
            <Image
              source={brandAssets.invite}
              style={styles.stepHeroImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text style={styles.title}>Join ReWorth</Text>
          <Text style={styles.copy}>
            Phone, email, or Google / Apple — then customise how neighbours see
            you.
          </Text>
          <Pressable
            style={[styles.methodRow, loading && styles.btnDisabled]}
            onPress={() => setStep("phone")}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with phone"
          >
            <Image
              source={brandAssets.actionChat}
              style={styles.methodIcon}
              resizeMode="contain"
            />
            <Text style={styles.methodLabel}>Continue with phone</Text>
          </Pressable>
          <Pressable
            style={[styles.methodRow, loading && styles.btnDisabled]}
            onPress={() => setStep("email")}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with email"
          >
            <Image
              source={brandAssets.actionShare}
              style={styles.methodIcon}
              resizeMode="contain"
            />
            <Text style={styles.methodLabel}>Continue with email</Text>
          </Pressable>
          <View style={styles.oauthDivider}>
            <View style={styles.oauthRule} />
            <Text style={styles.oauthOr}>or</Text>
            <View style={styles.oauthRule} />
          </View>
          <Pressable
            style={[styles.oauthBtn, loading && styles.btnDisabled]}
            onPress={() => void continueWithOAuth("google")}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <Text style={styles.oauthBtnText}>
              {loading ? "…" : "Continue with Google"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.oauthBtn, loading && styles.btnDisabled]}
            onPress={() => void continueWithOAuth("apple")}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
          >
            <Text style={styles.oauthBtnText}>Continue with Apple</Text>
          </Pressable>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === "phone" ? (
        <View>
          <View style={styles.stepHero}>
            <Image
              source={brandAssets.onboarding}
              style={styles.stepHeroImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text style={styles.title}>Your phone</Text>
          <Text style={styles.copy}>
            We’ll send a 6-digit code by SMS and WhatsApp at the same time.
          </Text>
          <View style={styles.channelRow} accessibilityLabel="Delivery channels">
            <View style={styles.channelChip}>
              <Image
                source={brandAssets.actionChat}
                style={styles.channelIcon}
                resizeMode="contain"
              />
              <Text style={styles.channelLabel}>SMS</Text>
            </View>
            <View style={styles.channelChip}>
              <Image
                source={brandAssets.invite}
                style={styles.channelIcon}
                resizeMode="contain"
              />
              <Text style={styles.channelLabel}>WhatsApp</Text>
            </View>
          </View>
          <Text style={styles.label}>Mobile number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            accessibilityLabel="Phone number"
            testID="phone-input"
            editable={!loading}
          />
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {debugHint ? <Text style={styles.hint}>{debugHint}</Text> : null}
          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={() => void requestOtp()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Send code"
            testID="send-otp"
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Sending…" : "Send code"}
            </Text>
          </Pressable>
          <Pressable onPress={() => setStep("method")}>
            <Text style={styles.link}>Back</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "otp" ? (
        <View>
          <View style={styles.otpHero}>
            <Image
              source={brandAssets.trustSecurePayment}
              style={styles.otpHeroImage}
              resizeMode="contain"
              accessibilityLabel="Secure code"
            />
            <Image
              source={brandAssets.verified}
              style={styles.otpVerified}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Enter code</Text>
          <Text style={styles.copy}>
            6-digit code from SMS or WhatsApp
          </Text>
          <TextInput
            style={[styles.input, styles.otpInput]}
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            accessibilityLabel="One-time code"
            testID="otp-input"
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
            accessibilityLabel="Verify"
            testID="verify-otp"
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Verifying…" : "Verify"}
            </Text>
          </Pressable>
          <Pressable onPress={() => setStep("phone")}>
            <Text style={styles.link}>Change number</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "email" ? (
        <View>
          <Text style={styles.title}>
            {emailMode === "register" ? "Create account" : "Welcome back"}
          </Text>
          <View style={styles.seg}>
            <Pressable
              style={[
                styles.segItem,
                emailMode === "register" && styles.segOn,
              ]}
              onPress={() => setEmailMode("register")}
            >
              <Text
                style={[
                  styles.segText,
                  emailMode === "register" && styles.segTextOn,
                ]}
              >
                Register
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segItem, emailMode === "login" && styles.segOn]}
              onPress={() => setEmailMode("login")}
            >
              <Text
                style={[
                  styles.segText,
                  emailMode === "login" && styles.segTextOn,
                ]}
              >
                Log in
              </Text>
            </Pressable>
          </View>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email"
            editable={!loading}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={
              emailMode === "register" ? "new-password" : "password"
            }
            accessibilityLabel="Password"
            editable={!loading}
          />
          {emailMode === "register" ? (
            <>
              <Text style={styles.label}>Display name (optional)</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                accessibilityLabel="Display name"
                editable={!loading}
              />
            </>
          ) : null}
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={() => void submitEmail()}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>
              {loading
                ? "…"
                : emailMode === "register"
                  ? "Create account"
                  : "Log in"}
            </Text>
          </Pressable>
          <Pressable onPress={() => setStep("method")}>
            <Text style={styles.link}>Back</Text>
          </Pressable>
        </View>
      ) : null}

      {step === "profile" ? (
        <View>
          <Text style={styles.title}>Customise your profile</Text>
          <Text style={styles.copy}>
            Name, photo, bio, and community — how Lagos neighbours see you.
          </Text>
          <Pressable
            style={styles.avatarBtn}
            onPress={() => void pickAvatar()}
            accessibilityRole="button"
            accessibilityLabel="Choose profile photo"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarPlus}>+</Text>
            )}
          </Pressable>
          <Text style={styles.hint}>Add a photo (optional)</Text>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            accessibilityLabel="Display name"
            editable={!loading}
          />
          <Text style={styles.label}>Bio (optional)</Text>
          <TextInput
            style={[styles.input, styles.bio]}
            value={bio}
            onChangeText={setBio}
            multiline
            accessibilityLabel="Bio"
            editable={!loading}
          />
          <Text style={styles.label}>Preferred community</Text>
          <View style={styles.chips}>
            {COMMUNITIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCommunity(c)}
                style={[styles.chip, community === c && styles.chipSelected]}
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
              {loading ? "Saving…" : "Enter ReWorth"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.sm,
  },
  brand: {
    fontSize: typeScale.titleSm,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: space.xl,
    letterSpacing: -0.3,
  },
  brandLogo: {
    width: 148,
    height: 40,
    marginBottom: space.xl,
  },
  welcomeHero: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: space.lg,
    backgroundColor: colors.surfaceWarm,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeImage: {
    width: "100%",
    height: "100%",
  },
  stepHero: {
    width: "100%",
    height: 160,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: space.lg,
    backgroundColor: colors.surfaceWarm,
    alignItems: "center",
    justifyContent: "center",
  },
  stepHeroImage: {
    width: "88%",
    height: "88%",
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: tap.min,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
    marginBottom: space.sm,
  },
  methodIcon: {
    width: 28,
    height: 28,
  },
  methodLabel: {
    flex: 1,
    fontSize: typeScale.body,
    fontWeight: "600",
    color: colors.ink,
  },
  channelRow: {
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.md,
  },
  channelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  channelIcon: {
    width: 18,
    height: 18,
  },
  channelLabel: {
    fontSize: typeScale.meta,
    fontWeight: "600",
    color: colors.muted,
  },
  otpHero: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
    height: 96,
  },
  otpHeroImage: {
    width: 72,
    height: 72,
  },
  otpVerified: {
    position: "absolute",
    right: "32%",
    bottom: 4,
    width: 28,
    height: 28,
  },
  title: {
    fontSize: typeScale.titleSm,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 26,
    marginBottom: space.sm,
  },
  copy: {
    fontSize: typeScale.bodySm,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: space.lg,
  },
  label: {
    fontSize: typeScale.meta,
    fontWeight: "500",
    color: colors.muted,
    marginBottom: space.xs,
    marginTop: space.md,
  },
  input: {
    minHeight: tap.min,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typeScale.body,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  otpInput: {
    letterSpacing: 8,
    fontWeight: "600",
    textAlign: "center",
  },
  bio: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  primaryBtn: {
    marginTop: space.xl,
    minHeight: tap.min,
    borderRadius: radius.lg,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  primaryBtnPressed: {
    backgroundColor: colors.orangePressed,
  },
  primaryBtnText: {
    color: colors.onAccent,
    fontSize: typeScale.bodySm,
    fontWeight: "600",
  },
  secondaryBtn: {
    marginTop: space.md,
    minHeight: tap.min,
    borderRadius: radius.lg,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: colors.onAccent,
    fontSize: typeScale.bodySm,
    fontWeight: "600",
  },
  oauthDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  oauthRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  oauthOr: {
    fontSize: typeScale.meta,
    color: colors.muted,
    fontWeight: "500",
  },
  oauthBtn: {
    marginTop: space.sm,
    minHeight: tap.min,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  oauthBtnText: {
    color: colors.ink,
    fontSize: typeScale.bodySm,
    fontWeight: "600",
  },
  btnDisabled: { opacity: 0.5 },
  link: {
    marginTop: space.lg,
    textAlign: "center",
    color: colors.orange,
    fontSize: typeScale.bodySm,
    fontWeight: "500",
  },
  error: {
    marginTop: space.sm,
    color: colors.error,
    fontSize: typeScale.meta,
  },
  hint: {
    marginTop: space.xs,
    color: colors.muted,
    fontSize: typeScale.meta,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginTop: space.sm,
  },
  chip: {
    minHeight: tap.min,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: colors.beige,
    borderColor: colors.navy,
  },
  chipText: {
    fontSize: typeScale.meta,
    color: colors.ink,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: colors.navy,
    fontWeight: "600",
  },
  seg: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: space.md,
  },
  segItem: {
    flex: 1,
    minHeight: tap.min,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  segOn: { backgroundColor: colors.beige },
  segText: { fontSize: typeScale.bodySm, color: colors.muted, fontWeight: "500" },
  segTextOn: { color: colors.navy, fontWeight: "600" },
  dots: {
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotOn: { backgroundColor: colors.orange },
  avatarBtn: {
    alignSelf: "center",
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.beige,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: space.xs,
  },
  avatarImg: { width: 88, height: 88 },
  avatarPlus: {
    fontSize: 32,
    color: colors.orange,
    fontWeight: "600",
  },
});
