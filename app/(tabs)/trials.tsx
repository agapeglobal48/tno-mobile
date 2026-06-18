import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../src/config/api";
import { useAuth } from "../../src/context/AuthContext";

const { width } = Dimensions.get("window");
const FILTERS = ["All", "Upcoming", "Registered", "Completed"];

// ── Types ─────────────────────────────────────────────────────
interface Trial {
  id: string;
  title: string;
  subtitle: string;
  sport: string;
  sportEmoji: string;
  date: string;
  day: string;
  month: string;
  time: string;
  venue: string;
  province: string;
  spots_total: number;
  spots_left: number;
  status: string;
  featured: boolean;
  prize: string;
  registered: boolean;
}

// ── Helpers ───────────────────────────────────────────────────
function getSpotsColor(left: number, total: number) {
  const pct = left / total;
  if (pct <= 0) return "#555";
  if (pct <= 0.2) return "#F59E0B";
  return "#22c55e";
}

function getSpotsLabel(left: number, total: number) {
  if (left === 0) return "Full";
  if (left / total <= 0.2) return `${left} left — Almost Full!`;
  return `${left} of ${total} spots`;
}

// ── Featured card ─────────────────────────────────────────────
function FeaturedCard({
  trial,
  onRegister,
  registering,
}: {
  trial: Trial;
  onRegister: (id: string) => void;
  registering: boolean;
}) {
  const spotsColor = getSpotsColor(trial.spots_left, trial.spots_total);
  const pct = Math.round((1 - trial.spots_left / trial.spots_total) * 100);

  return (
    <View style={feat.card}>
      <View style={feat.accentBar} />
      <View style={feat.header}>
        <View style={feat.sportBadge}>
          <Text style={feat.sportEmoji}>{trial.sportEmoji}</Text>
          <Text style={feat.sportName}>{trial.sport}</Text>
        </View>
        <View style={feat.featuredBadge}>
          <Text style={feat.featuredText}>⭐ FEATURED</Text>
        </View>
      </View>
      <Text style={feat.title}>{trial.title}</Text>
      <Text style={feat.subtitle}>{trial.subtitle}</Text>
      <View style={feat.infoGrid}>
        <View style={feat.infoBox}>
          <Text style={feat.infoIcon}>📅</Text>
          <Text style={feat.infoLabel}>DATE</Text>
          <Text style={feat.infoValue}>{trial.date}</Text>
        </View>
        <View style={feat.infoDivider} />
        <View style={feat.infoBox}>
          <Text style={feat.infoIcon}>🕐</Text>
          <Text style={feat.infoLabel}>TIME</Text>
          <Text style={feat.infoValue}>{trial.time}</Text>
        </View>
        <View style={feat.infoDivider} />
        <View style={feat.infoBox}>
          <Text style={feat.infoIcon}>🏆</Text>
          <Text style={feat.infoLabel}>PRIZE</Text>
          <Text style={feat.infoValue}>{trial.prize}</Text>
        </View>
      </View>
      <View style={feat.venueRow}>
        <Text style={feat.venueIcon}>📍</Text>
        <Text style={feat.venueText}>{trial.venue}</Text>
      </View>
      <View style={feat.spotsRow}>
        <Text style={[feat.spotsText, { color: spotsColor }]}>
          {getSpotsLabel(trial.spots_left, trial.spots_total)}
        </Text>
        <Text style={feat.spotsPct}>{pct}% filled</Text>
      </View>
      <View style={feat.progressBg}>
        <View
          style={[
            feat.progressFill,
            { width: `${pct}%` as any, backgroundColor: spotsColor },
          ]}
        />
      </View>
      <TouchableOpacity
        style={[feat.registerBtn, trial.registered && feat.registeredBtn]}
        onPress={() => onRegister(trial.id)}
        disabled={registering || trial.spots_left === 0}
        activeOpacity={0.85}
      >
        {registering ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text
            style={[
              feat.registerText,
              trial.registered && { color: "#22c55e" },
            ]}
          >
            {trial.registered ? "✓  Registered" : "Register Now  →"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const feat = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 20,
    overflow: "hidden",
    padding: 18,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#D32F2F",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 6,
  },
  sportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(211,47,47,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sportEmoji: { fontSize: 14 },
  sportName: { color: "#EF4444", fontSize: 12, fontWeight: "700" },
  featuredBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    color: "#F5F5F5",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subtitle: { color: "#666", fontSize: 12, marginBottom: 16 },
  infoGrid: {
    flexDirection: "row",
    backgroundColor: "#0F0F0F",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoBox: { flex: 1, alignItems: "center", gap: 4 },
  infoDivider: { width: 0.5, backgroundColor: "#2A2A2A", marginVertical: 4 },
  infoIcon: { fontSize: 16 },
  infoLabel: {
    color: "#555",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  infoValue: {
    color: "#F5F5F5",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  venueIcon: { fontSize: 13 },
  venueText: { color: "#888", fontSize: 12, flex: 1 },
  spotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  spotsText: { fontSize: 12, fontWeight: "700" },
  spotsPct: { color: "#555", fontSize: 11 },
  progressBg: {
    height: 4,
    backgroundColor: "#1C1C1C",
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  registerBtn: {
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  registeredBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  registerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

// ── Regular trial card ────────────────────────────────────────
function TrialCard({
  trial,
  onRegister,
  registering,
}: {
  trial: Trial;
  onRegister: (id: string) => void;
  registering: boolean;
}) {
  const spotsColor = getSpotsColor(trial.spots_left, trial.spots_total);
  const isFull = trial.spots_left === 0;
  const isCompleted = trial.status === "Completed";

  return (
    <View style={card.container}>
      <View style={card.dateCol}>
        <Text style={card.day}>{trial.day}</Text>
        <Text style={card.month}>{trial.month}</Text>
        <View
          style={[
            card.dot,
            { backgroundColor: isCompleted ? "#555" : spotsColor },
          ]}
        />
        <View style={card.line} />
      </View>
      <View style={card.content}>
        <View style={card.badgeRow}>
          <View style={card.sportPill}>
            <Text style={card.sportPillText}>
              {trial.sportEmoji} {trial.sport}
            </Text>
          </View>
          {trial.registered && (
            <View style={card.regPill}>
              <Text style={card.regPillText}>✓ Registered</Text>
            </View>
          )}
          {isCompleted && (
            <View style={card.completedPill}>
              <Text style={card.completedPillText}>Completed</Text>
            </View>
          )}
          {!isCompleted &&
            trial.spots_left / trial.spots_total <= 0.2 &&
            trial.spots_left > 0 && (
              <View style={card.hotPill}>
                <Text style={card.hotPillText}>🔥 Hot</Text>
              </View>
            )}
        </View>
        <Text style={card.title}>{trial.title}</Text>
        <View style={card.infoRow}>
          <Text style={card.infoIcon}>🕐</Text>
          <Text style={card.infoText}>
            {trial.time} · {trial.province}
          </Text>
        </View>
        <View style={card.infoRow}>
          <Text style={card.infoIcon}>📍</Text>
          <Text style={card.infoText} numberOfLines={1}>
            {trial.venue}
          </Text>
        </View>
        <View style={card.infoRow}>
          <Text style={card.infoIcon}>🏆</Text>
          <Text style={card.infoText}>{trial.prize}</Text>
        </View>
        {!isCompleted && (
          <View style={card.footer}>
            <Text style={[card.spotsText, { color: spotsColor }]}>
              {getSpotsLabel(trial.spots_left, trial.spots_total)}
            </Text>
            {!isFull && (
              <TouchableOpacity
                style={[
                  card.registerBtn,
                  trial.registered && card.unregisterBtn,
                ]}
                onPress={() => onRegister(trial.id)}
                disabled={registering}
                activeOpacity={0.8}
              >
                {registering ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={card.registerText}>
                    {trial.registered ? "Unregister" : "Register →"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  container: { flexDirection: "row", marginHorizontal: 20, marginBottom: 4 },
  dateCol: { width: 44, alignItems: "center", paddingTop: 4 },
  day: { color: "#F5F5F5", fontSize: 18, fontWeight: "900", lineHeight: 20 },
  month: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 8,
    marginBottom: 4,
  },
  line: { flex: 1, width: 1, backgroundColor: "#1E1E1E", marginBottom: -4 },
  content: {
    flex: 1,
    marginLeft: 14,
    marginBottom: 20,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 16,
    padding: 14,
  },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  sportPill: {
    backgroundColor: "rgba(211,47,47,0.12)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sportPillText: { color: "#EF4444", fontSize: 10, fontWeight: "700" },
  regPill: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  regPillText: { color: "#22c55e", fontSize: 10, fontWeight: "700" },
  completedPill: {
    backgroundColor: "#1C1C1C",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completedPillText: { color: "#555", fontSize: 10, fontWeight: "700" },
  hotPill: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hotPillText: { color: "#F59E0B", fontSize: 10, fontWeight: "700" },
  title: {
    color: "#F5F5F5",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoIcon: { fontSize: 11, width: 16 },
  infoText: { color: "#888", fontSize: 11, flex: 1 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#222",
  },
  spotsText: { fontSize: 11, fontWeight: "700" },
  registerBtn: {
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: "center",
  },
  unregisterBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#555",
  },
  registerText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});

// ── Stats bar ─────────────────────────────────────────────────
function StatsBar({ trials }: { trials: Trial[] }) {
  const total = trials.length;
  const open = trials.filter((t) => t.status === "Open").length;
  const registered = trials.filter((t) => t.registered).length;

  return (
    <View style={stats.row}>
      <View style={stats.item}>
        <Text style={stats.number}>{total}</Text>
        <Text style={stats.label}>Total Trials</Text>
      </View>
      <View style={stats.divider} />
      <View style={stats.item}>
        <Text style={stats.number}>{open}</Text>
        <Text style={stats.label}>Open Now</Text>
      </View>
      <View style={stats.divider} />
      <View style={stats.item}>
        <Text style={stats.number}>{registered}</Text>
        <Text style={stats.label}>Registered</Text>
      </View>
    </View>
  );
}

const stats = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 14,
    paddingVertical: 14,
  },
  item: { flex: 1, alignItems: "center" },
  divider: { width: 0.5, backgroundColor: "#2A2A2A" },
  number: { color: "#EF4444", fontSize: 22, fontWeight: "900" },
  label: { color: "#666", fontSize: 10, marginTop: 2, letterSpacing: 0.5 },
});

// ── Main screen ───────────────────────────────────────────────
export default function TrialsScreen() {
  const insets = useSafeAreaInsets();
  const { athlete } = useAuth();

  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchTrials = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const url = athlete?.id
          ? `${API_BASE_URL}/api/trials?athlete_id=${athlete.id}`
          : `${API_BASE_URL}/api/trials`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) setTrials(data.data ?? []);
        else setError("Could not load trials.");
      } catch {
        setError("Cannot reach server.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [athlete?.id],
  );

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTrials();
    }, [fetchTrials]),
  );

  async function handleRegister(trialId: string) {
    if (!athlete?.id) return;
    setRegisteringId(trialId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/trials/${trialId}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athlete_id: athlete.id }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        // Update local state immediately
        setTrials((prev) =>
          prev.map((t) => {
            if (t.id !== trialId) return t;
            const newRegistered = data.registered;
            return {
              ...t,
              registered: newRegistered,
              spots_left: newRegistered ? t.spots_left - 1 : t.spots_left + 1,
            };
          }),
        );
      }
    } catch {
    } finally {
      setRegisteringId(null);
    }
  }

  const filtered = trials.filter((t) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Upcoming")
      return t.status === "Open" && !t.registered;
    if (activeFilter === "Registered") return t.registered;
    if (activeFilter === "Completed") return t.status === "Completed";
    return true;
  });

  const featured = filtered.filter((t) => t.featured);
  const regular = filtered.filter((t) => !t.featured);

  if (loading) {
    return (
      <View
        style={[
          styles.root,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <StatusBar hidden={true} />
        <ActivityIndicator color="#EF4444" size="large" />
        <Text style={{ color: "#666", fontSize: 13, marginTop: 12 }}>
          Loading trials...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />
      <FlatList
        data={regular}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTrials(true)}
            tintColor="#EF4444"
            colors={["#EF4444"]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={styles.heading}>TRIALS &</Text>
                <Text style={styles.headingAccent}>EVENTS</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.headerSub}>Pakistan Sports Initiative</Text>
                <Text style={styles.headerEmoji}>🏅</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
                <TouchableOpacity
                  onPress={() => fetchTrials()}
                  style={styles.retryBtn}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <StatsBar trials={trials} />
            )}

            {/* Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              style={styles.filterRow}
            >
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    activeFilter === f && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === f && styles.filterTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Featured */}
            {featured.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>⭐ FEATURED</Text>
                {featured.map((t) => (
                  <FeaturedCard
                    key={t.id}
                    trial={t}
                    onRegister={handleRegister}
                    registering={registeringId === t.id}
                  />
                ))}
              </>
            )}

            {regular.length > 0 && (
              <Text style={styles.sectionLabel}>📅 UPCOMING EVENTS</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <TrialCard
            trial={item}
            onRegister={handleRegister}
            registering={registeringId === item.id}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏟</Text>
              <Text style={styles.emptyTitle}>No trials found</Text>
              <Text style={styles.emptyText}>
                {activeFilter === "Registered"
                  ? "You haven't registered for any trials yet."
                  : "Check back soon for new events."}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 30 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heading: {
    fontSize: 30,
    fontWeight: "900",
    color: "#F5F5F5",
    letterSpacing: 1,
    lineHeight: 32,
  },
  headingAccent: {
    fontSize: 30,
    fontWeight: "900",
    color: "#EF4444",
    letterSpacing: 1,
    lineHeight: 32,
  },
  headerRight: { alignItems: "flex-end", gap: 4 },
  headerSub: { color: "#555", fontSize: 10, letterSpacing: 0.5 },
  headerEmoji: { fontSize: 28 },
  filterRow: { marginBottom: 20 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  filterPill: {
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterPillActive: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  filterText: { color: "#666", fontSize: 13, fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 2,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 0.5,
    borderColor: "#EF4444",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  errorText: { color: "#EF4444", fontSize: 13 },
  retryBtn: {
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: "#F5F5F5", fontSize: 18, fontWeight: "800" },
  emptyText: {
    color: "#555",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
