/**
 * Device push token registration (store readiness).
 * Uses expo-notifications when installed; otherwise registers a mock token in __DEV__.
 */

import { Platform } from "react-native";
import { apiFetch } from "./api";

export async function registerDevicePushToken(token: string): Promise<void> {
  let pushToken: string | null = null;
  let platform = Platform.OS;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require("expo-notifications") as {
      getPermissionsAsync: () => Promise<{ status: string }>;
      requestPermissionsAsync: () => Promise<{ status: string }>;
      getExpoPushTokenAsync: (opts?: {
        projectId?: string;
      }) => Promise<{ data: string }>;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants") as {
      expoConfig?: { extra?: { eas?: { projectId?: string } } };
      easConfig?: { projectId?: string };
    };

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") {
      return;
    }

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    pushToken = result.data;
  } catch {
    if (__DEV__) {
      pushToken = `ExponentPushToken[dev-mock-${Platform.OS}]`;
      platform = Platform.OS;
    }
  }

  if (!pushToken) return;

  await apiFetch("/devices/push-token", {
    method: "POST",
    token,
    body: { token: pushToken, platform },
  });
}
