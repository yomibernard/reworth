import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  createAssistantSession,
  sendAssistantMessage,
} from "./lib/assistant";
import {
  bookManagedPickup,
  createConsignment,
  createValuation,
  generateWatPickupSlots,
  listMyConsignments,
  listMyManagedPickups,
  type Consignment,
  type ManagedPickup,
  type ManagedPickupSlot,
  type ValuationCard,
} from "./lib/platform-services";
import {
  createRoomScan,
  createRoomScanDrafts,
  pollRoomScanUntilReady,
  startRoomScanDetect,
  type RoomScan,
} from "./lib/room-scan";
import { formatNgnFromKobo } from "./lib/types";

export type PlatformTool =
  | "ask"
  | "worth"
  | "scan"
  | "consign"
  | "pickup"
  | null;

type Props = {
  tool: PlatformTool;
  city?: string;
  onClose: () => void;
  onOpenListing?: (id: string) => void;
};

const TOOL_TITLES: Record<Exclude<PlatformTool, null>, string> = {
  ask: "Ask ReWorth",
  worth: "What's it worth",
  scan: "Room scan",
  consign: "Consign",
  pickup: "Managed pickup",
};

export function PlatformToolsModal({
  tool,
  city = "Lagos",
  onClose,
  onOpenListing,
}: Props) {
  if (!tool) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{TOOL_TITLES[tool]}</Text>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        {tool === "ask" ? <AskPanel city={city} /> : null}
        {tool === "worth" ? <WorthPanel city={city} /> : null}
        {tool === "scan" ? (
          <ScanPanel city={city} onOpenListing={onOpenListing} />
        ) : null}
        {tool === "consign" ? <ConsignPanel city={city} /> : null}
        {tool === "pickup" ? <PickupPanel city={city} /> : null}
      </View>
    </Modal>
  );
}

function AskPanel({ city }: { city: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState(
    "Furnish a one-bed in Lekki with ₦1.5m",
  );
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const token = await getAccessToken();
    if (!token) throw new Error("Sign in to ask ReWorth");
    const s = await createAssistantSession(token, { city });
    setSessionId(s.id);
    return s.id;
  }, [city, sessionId]);

  async function send() {
    if (!input.trim()) return;
    setBusy(true);
    setError(null);
    const userText = input.trim();
    setMessages((m) => [...m, { role: "user", content: userText }]);
    setInput("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to ask ReWorth");
      const id = await ensureSession();
      const res = await sendAssistantMessage(token, id, userText);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.message?.content ?? res.proposal?.summary ?? "Done.",
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.body}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.pad}>
        <Text style={styles.hint}>
          Budget / bundle questions grounded in live listings · {city}
        </Text>
        {messages.map((m, i) => (
          <View
            key={`${m.role}-${i}`}
            style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.botBubble]}
          >
            <Text style={styles.bubbleText}>{m.content}</Text>
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about budget, bundles, price…"
          editable={!busy}
          multiline
        />
        <Pressable
          style={[styles.primaryBtn, busy && styles.disabled]}
          disabled={busy}
          onPress={() => void send()}
        >
          <Text style={styles.primaryBtnText}>{busy ? "…" : "Send"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WorthPanel({ city }: { city: string }) {
  const [card, setCard] = useState<ValuationCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const result = await createValuation(token, { city });
      setCard(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Valuation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.hint}>
        Guidance only — not a binding offer. City: {city}
      </Text>
      <Pressable
        style={[styles.primaryBtn, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void run()}
      >
        <Text style={styles.primaryBtnText}>
          {busy ? "Estimating…" : "Get estimate"}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {card ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recommended</Text>
          <Text style={styles.price}>
            {formatNgnFromKobo(card.recommendedKobo)}
          </Text>
          <Text style={styles.meta}>
            Range {formatNgnFromKobo(card.estimatedLowKobo)} –{" "}
            {formatNgnFromKobo(card.estimatedHighKobo)}
          </Text>
          <Text style={styles.meta}>
            Quick sale {formatNgnFromKobo(card.quickSaleKobo)} · Max{" "}
            {formatNgnFromKobo(card.maxValueKobo)}
          </Text>
          {card.confidenceLabel ? (
            <Text style={styles.meta}>Confidence: {card.confidenceLabel}</Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function ScanPanel({
  city,
  onOpenListing,
}: {
  city: string;
  onOpenListing?: (id: string) => void;
}) {
  const [scan, setScan] = useState<RoomScan | null>(null);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setDraftIds([]);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to room-scan");
      // Mock fixture keys — vision provider is mock in local/dev
      const created = await createRoomScan(token, {
        photoKeys: ["room-scan/fixture-living-1.jpg"],
        city,
      });
      await startRoomScanDetect(token, created.id);
      const ready = await pollRoomScanUntilReady(token, created.id);
      setScan(ready);
      if (ready.status === "READY" || ready.status === "DRAFTS_CREATED") {
        const drafts = await createRoomScanDrafts(token, created.id);
        setScan(drafts.roomScan);
        setDraftIds(drafts.drafts.map((d) => d.listingId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.hint}>
        Photograph a room → detect saleable items → draft listings. Uses mock
        vision locally.
      </Text>
      <Pressable
        style={[styles.primaryBtn, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void run()}
      >
        <Text style={styles.primaryBtnText}>
          {busy ? "Scanning…" : "Run demo scan"}
        </Text>
      </Pressable>
      {busy ? <ActivityIndicator color="#0E9F6E" style={{ marginTop: 16 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {scan ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status: {scan.status}</Text>
          {(scan.items ?? []).map((it) => (
            <Text key={it.id} style={styles.meta}>
              · {it.label}
              {it.selected === false ? " (skipped)" : ""}
            </Text>
          ))}
          {draftIds.map((id) => (
            <Pressable key={id} onPress={() => onOpenListing?.(id)}>
              <Text style={styles.link}>Draft listing {id.slice(0, 8)}…</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function ConsignPanel({ city }: { city: string }) {
  const [items, setItems] = useState<Consignment[]>([]);
  const [title, setTitle] = useState("");
  const [asking, setAsking] = useState("");
  const [floor, setFloor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const list = await listMyConsignments(token);
    setItems(list);
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to consign");
      const askingPriceKobo = Math.round(Number(asking || 0) * 100);
      const floorPriceKobo = Math.round(Number(floor || 0) * 100);
      await createConsignment(token, {
        title: title.trim() || "Consignment item",
        askingPriceKobo,
        floorPriceKobo,
        city,
      });
      setTitle("");
      setAsking("");
      setFloor("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.hint}>
        Hand inventory to ReWorth/partner ops. City: {city}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Item title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Asking price (₦)"
        keyboardType="numeric"
        value={asking}
        onChangeText={setAsking}
      />
      <TextInput
        style={styles.input}
        placeholder="Floor price (₦)"
        keyboardType="numeric"
        value={floor}
        onChangeText={setFloor}
      />
      <Pressable
        style={[styles.primaryBtn, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void submit()}
      >
        <Text style={styles.primaryBtnText}>
          {busy ? "Submitting…" : "Create consignment"}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.cardTitle}>{c.title}</Text>
          <Text style={styles.meta}>
            {c.status} · ask {formatNgnFromKobo(c.askingPriceKobo)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function PickupPanel({ city }: { city: string }) {
  const [slots, setSlots] = useState<ManagedPickupSlot[]>([]);
  const [pickups, setPickups] = useState<ManagedPickup[]>([]);
  const [address, setAddress] = useState("");
  const [selected, setSelected] = useState<ManagedPickupSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSlots(generateWatPickupSlots(6));
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        setPickups(await listMyManagedPickups(token));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function book() {
    if (!selected || !address.trim()) {
      setError("Pick a slot and enter an address");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to book pickup");
      await bookManagedPickup(token, {
        slotStartAt: selected.slotStartAt,
        slotEndAt: selected.slotEndAt,
        addressLine: address.trim(),
        city,
      });
      const list = await listMyManagedPickups(token);
      setPickups(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.hint}>WAT slots · managed pickup · {city}</Text>
      <TextInput
        style={styles.input}
        placeholder="Pickup address"
        value={address}
        onChangeText={setAddress}
      />
      {slots.map((s) => (
        <Pressable
          key={s.slotStartAt}
          style={[styles.slot, selected?.slotStartAt === s.slotStartAt && styles.slotActive]}
          onPress={() => setSelected(s)}
        >
          <Text style={styles.meta}>{s.label}</Text>
        </Pressable>
      ))}
      <Pressable
        style={[styles.primaryBtn, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void book()}
      >
        <Text style={styles.primaryBtnText}>{busy ? "Booking…" : "Book pickup"}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {pickups.map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.cardTitle}>{p.status}</Text>
          <Text style={styles.meta}>{p.addressLine}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAF9F7" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E2DC",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  close: { color: "#0E9F6E", fontWeight: "600", fontSize: 16 },
  body: { flex: 1 },
  flex: { flex: 1 },
  pad: { padding: 16, gap: 12, paddingBottom: 40 },
  hint: { color: "#6B7280", fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E2DC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#1A1A1A",
  },
  primaryBtn: {
    backgroundColor: "#0E9F6E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.5 },
  error: { color: "#B91C1C", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E2DC",
  },
  cardTitle: { fontWeight: "700", fontSize: 16, color: "#1A1A1A" },
  price: { fontSize: 24, fontWeight: "700", color: "#0E9F6E" },
  meta: { color: "#6B7280", fontSize: 14 },
  link: { color: "#0E9F6E", fontWeight: "600", marginTop: 4 },
  bubble: { borderRadius: 12, padding: 12, maxWidth: "92%" },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#D1FAE5" },
  botBubble: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E2DC" },
  bubbleText: { color: "#1A1A1A", fontSize: 15, lineHeight: 21 },
  composer: { padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E2DC" },
  slot: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E2DC",
    backgroundColor: "#fff",
  },
  slotActive: { borderColor: "#0E9F6E", backgroundColor: "#ECFDF5" },
});
