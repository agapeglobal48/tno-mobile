import { useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// ── Dummy data ────────────────────────────────────────────────
const FILTERS = ["All", "Upcoming", "Registered", "Completed"];

const TRIALS = [
  {
    id: "1",
    title: "National Cricket Trials",
    subtitle: "Open Selection — All Provinces",
    sport: "Cricket",
    sportEmoji: "🏏",
    date: "Dec 15, 2024",
    day: "15",
    month: "DEC",
    time: "9:30 AM",
    venue: "Gaddafi Stadium, Lahore",
    province: "Punjab",
    spotsTotal: 100,
    spotsLeft: 45,
    status: "Open",
    registered: false,
    featured: true,
    prize: "PKR 50,000",
  },
  {
    id: "2",
    title: "Provincial Football Cup",
    subtitle: "Punjab Regional Selection",
    sport: "Football",
    sportEmoji: "⚽",
    date: "Jan 8, 2025",
    day: "08",
    month: "JAN",
    time: "2:00 PM",
    venue: "Punjab Sports Complex, Lahore",
    province: "Punjab",
    spotsTotal: 100,
    spotsLeft: 11,
    status: "Open",
    registered: false,
    featured: false,
    prize: "PKR 25,000",
  },
  {
    id: "3",
    title: "Karachi Boxing Championship",
    subtitle: "Sindh Provincial Qualifier",
    sport: "Boxing",
    sportEmoji: "🥊",
    date: "Jan 20, 2025",
    day: "20",
    month: "JAN",
    time: "10:00 AM",
    venue: "PSB Arena, Karachi",
    province: "Sindh",
    spotsTotal: 60,
    spotsLeft: 30,
    status: "Open",
    registered: true,
    featured: false,
    prize: "PKR 30,000",
  },
  {
    id: "4",
    title: "National Swimming Trials",
    subtitle: "Federal Level Selection",
    sport: "Swimming",
    sportEmoji: "🏊",
    date: "Feb 2, 2025",
    day: "02",
    month: "FEB",
    time: "8:00 AM",
    venue: "Aquatic Centre, Islamabad",
    province: "Federal",
    spotsTotal: 40,
    spotsLeft: 0,
    status: "Completed",
    registered: false,
    featured: false,
    prize: "PKR 20,000",
  },
  {
    id: "5",
    title: "KPK Athletics Meet",
    subtitle: "Open Track & Field Trials",
    sport: "Athletics",
    sportEmoji: "🏃",
    date: "Feb 15, 2025",
    day: "15",
    month: "FEB",
    time: "7:00 AM",
    venue: "Hayatabad Sports Complex, Peshawar",
    province: "KPK",
    spotsTotal: 80,
    spotsLeft: 60,
    status: "Open",
    registered: false,
    featured: false,
    prize: "PKR 15,000",
  },
];

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

// ── Featured banner card ──────────────────────────────────────
function FeaturedCard({
  trial,
  onRegister,
}: {
  trial: any;
  onRegister: (id: string) => void;
}) {
  const spotsColor = getSpotsColor(trial.spotsLeft, trial.spotsTotal);
  const pct = Math.round((1 - trial.spotsLeft / trial.spotsTotal) * 100);

  return (
    <View style={feat.card}>
      {/* Top accent bar */}
      <View style={feat.accentBar} />

      {/* Header row */}
      <View style={feat.header}>
        <View style={feat.sportBadge}>
          <Text style={feat.sportEmoji}>{trial.sportEmoji}</Text>
          <Text style={feat.sportName}>{trial.sport}</Text>
        </View>
        <View style={feat.featuredBadge}>
          <Text style={feat.featuredText}>⭐ FEATURED</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={feat.title}>{trial.title}</Text>
      <Text style={feat.subtitle}>{trial.subtitle}</Text>

      {/* Date / Time / Venue row */}
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

      {/* Venue */}
      <View style={feat.venueRow}>
        <Text style={feat.venueIcon}>📍</Text>
        <Text style={feat.venueText}>{trial.venue}</Text>
      </View>

      {/* Spots progress bar */}
      <View style={feat.spotsRow}>
        <Text style={[feat.spotsText, { color: spotsColor }]}>
          {getSpotsLabel(trial.spotsLeft, trial.spotsTotal)}
        </Text>
        <Text style={feat.spotsPct}>{pct}% filled</Text>
      </View>
      <View style={feat.progressBg}>
        <View
          style={[
            feat.progressFill,
            { width: `${pct}%`, backgroundColor: spotsColor },
          ]}
        />
      </View>

      {/* Register button */}
      <TouchableOpacity
        style={[feat.registerBtn, trial.registered && feat.registeredBtn]}
        onPress={() => onRegister(trial.id)}
        activeOpacity={0.85}
      >
        <Text style={feat.registerText}>
          {trial.registered ? "✓  Registered" : "Register Now  →"}
        </Text>
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
}: {
  trial: any;
  onRegister: (id: string) => void;
}) {
  const spotsColor = getSpotsColor(trial.spotsLeft, trial.spotsTotal);
  const isFull = trial.spotsLeft === 0;
  const isCompleted = trial.status === "Completed";

  return (
    <View style={card.container}>
      {/* Left date column */}
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

      {/* Right content */}
      <View style={card.content}>
        {/* Sport + status badges */}
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
            trial.spotsLeft / trial.spotsTotal <= 0.2 &&
            trial.spotsLeft > 0 && (
              <View style={card.hotPill}>
                <Text style={card.hotPillText}>🔥 Hot</Text>
              </View>
            )}
        </View>

        {/* Title */}
        <Text style={card.title}>{trial.title}</Text>

        {/* Info rows */}
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

        {/* Spots + action */}
        {!isCompleted && (
          <View style={card.footer}>
            <Text style={[card.spotsText, { color: spotsColor }]}>
              {getSpotsLabel(trial.spotsLeft, trial.spotsTotal)}
            </Text>
            {!isFull && !trial.registered && (
              <TouchableOpacity
                style={card.registerBtn}
                onPress={() => onRegister(trial.id)}
                activeOpacity={0.8}
              >
                <Text style={card.registerText}>Register →</Text>
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

  // Date column
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

  // Content
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
  },
  registerText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});

// ── Stats bar ─────────────────────────────────────────────────
function StatsBar() {
  return (
    <View style={stats.row}>
      <View style={stats.item}>
        <Text style={stats.number}>5</Text>
        <Text style={stats.label}>Total Trials</Text>
      </View>
      <View style={stats.divider} />
      <View style={stats.item}>
        <Text style={stats.number}>3</Text>
        <Text style={stats.label}>Open Now</Text>
      </View>
      <View style={stats.divider} />
      <View style={stats.item}>
        <Text style={stats.number}>1</Text>
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
  const [activeFilter, setActiveFilter] = useState("All");
  const [trials, setTrials] = useState(TRIALS);
  const [loading, setLoading] = useState(false);

  function handleRegister(id: string) {
    setTrials((prev) =>
      prev.map((t) => (t.id === id ? { ...t, registered: !t.registered } : t)),
    );
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

  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />

      <FlatList
        data={regular}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
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

            {/* Stats */}
            <StatsBar />

            {/* Filter pills */}
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

            {/* Featured card */}
            {featured.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>⭐ FEATURED</Text>
                {featured.map((t) => (
                  <FeaturedCard
                    key={t.id}
                    trial={t}
                    onRegister={handleRegister}
                  />
                ))}
              </>
            )}

            {/* Timeline label */}
            {regular.length > 0 && (
              <Text style={styles.sectionLabel}>📅 UPCOMING EVENTS</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <TrialCard trial={item} onRegister={handleRegister} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏟</Text>
            <Text style={styles.emptyTitle}>No trials found</Text>
            <Text style={styles.emptyText}>Check back soon for new events</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 30 }} />}
        contentContainerStyle={{ paddingBottom: 10 }}
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

  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: "#F5F5F5", fontSize: 18, fontWeight: "800" },
  emptyText: { color: "#555", fontSize: 13 },
});
