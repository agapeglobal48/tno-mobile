import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

// ── Types ────────────────────────────────────────────────────
interface Athlete {
  id: string;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  sport: string;
  achievements?: string;
  photo_url?: string;
  status: string;
  followers?: number;
  following?: number;
  videos?: number;
  bio?: string;
  city?: string;
}

// ── Helpers ──────────────────────────────────────────────────
function formatSport(sport: string) {
  return (
    sport?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? ""
  );
}

function formatHandle(name: string) {
  return "@" + name.toLowerCase().replace(/\s+/g, "_");
}

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return String(n);
}

// ── Legend Endorsement Row ────────────────────────────────────
function EndorsementRow({
  initial,
  name,
  role,
  color,
}: {
  initial: string;
  name: string;
  role: string;
  color: string;
}) {
  return (
    <View style={eStyles.row}>
      <View style={[eStyles.avatar, { backgroundColor: color }]}>
        <Text style={eStyles.avatarText}>{initial}</Text>
      </View>
      <View style={eStyles.info}>
        <Text style={eStyles.name}>{name}</Text>
        <Text style={eStyles.role}>{role}</Text>
      </View>
      <TouchableOpacity style={eStyles.shareBtn} activeOpacity={0.7}>
        <Text style={eStyles.shareIcon}>⬆</Text>
      </TouchableOpacity>
    </View>
  );
}

const eStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2A2A2A",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  info: { flex: 1 },
  name: { color: "#F5F5F5", fontSize: 14, fontWeight: "700" },
  role: { color: "#888", fontSize: 12, marginTop: 2 },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1C1C1C",
    borderWidth: 0.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  shareIcon: { color: "#CCC", fontSize: 13 },
});

// ── Main Screen ───────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { athlete: contextAthlete, updateAthlete, logout } = useAuth();

  const [athlete, setAthleteLocal] = useState<Athlete | null>(null);

  useEffect(() => {
    // Prefer context athlete, fall back to params (for backward compat)
    if (contextAthlete) {
      setAthleteLocal(contextAthlete);
    } else if (params.athlete) {
      try {
        setAthleteLocal(JSON.parse(params.athlete as string));
      } catch {}
    }
  }, [contextAthlete, params.athlete]);

  if (!athlete) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const followers = athlete.followers ?? 0;
  const following = athlete.following ?? 0;
  const videos = athlete.videos ?? 0;
  const city = athlete.city ?? "";
  const bio = athlete.bio ?? athlete.achievements ?? "";

  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Text style={styles.handle}>{formatHandle(athlete.name)}</Text>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Text style={styles.iconBtnText}>⬆</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/edit-profile",
                  params: { athlete: JSON.stringify(athlete) },
                })
              }
            >
              <Text style={styles.iconBtnText}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {athlete.photo_url ? (
              <Image
                source={{ uri: athlete.photo_url }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {athlete.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {/* Verified badge */}
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedCheck}>✓</Text>
            </View>
          </View>
        </View>

        {/* ── Name + Tags ── */}
        <View style={styles.nameSection}>
          <Text style={styles.athleteName}>{athlete.name.toUpperCase()}</Text>
          <View style={styles.tagsRow}>
            <View style={styles.tagRed}>
              <Text style={styles.tagRedText}>
                {formatSport(athlete.sport)}
              </Text>
            </View>
            {city ? (
              <View style={styles.tagDark}>
                <Text style={styles.tagDarkText}>{city}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Edit Profile Button ── */}
        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/edit-profile",
              params: { athlete: JSON.stringify(athlete) },
            })
          }
        >
          <Text style={styles.editBtnIcon}>✎</Text>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(followers)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(following)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(videos)}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
        </View>

        {/* ── Bio ── */}
        {bio ? (
          <>
            <Text style={styles.sectionLabel}>PREVIOUS ACHIEVEMENTS</Text>
            <Text style={styles.bio}>{bio}</Text>
          </>
        ) : null}

        {/* ── Legend Endorsements ── */}
        <View style={styles.endorseCard}>
          <View style={styles.endorseHeader}>
            <Text style={styles.endorseTrophy}>🏆</Text>
            <Text style={styles.endorseTitle}>LEGEND ENDORSEMENTS</Text>
          </View>

          {athlete.status === "approved" ? (
            <>
              <EndorsementRow
                initial="S"
                name="Shoaib Akhtar"
                role="Fast Bowling • PCBC"
                color="#C62828"
              />
              <EndorsementRow
                initial="W"
                name="Wasim Akram"
                role="Left Armer • Nightweaver"
                color="#1565C0"
              />
            </>
          ) : (
            <View style={styles.endorsePending}>
              <Text style={styles.endorsePendingIcon}>⏳</Text>
              <Text style={styles.endorsePendingText}>
                Endorsements unlock after your trial is approved
              </Text>
            </View>
          )}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            logout();
            router.replace("/login");
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  safeArea: { flex: 1, backgroundColor: "#0A0A0A" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 10 },

  loading: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#666", fontSize: 14 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    color: "#666",
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  handle: {
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  topActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1C1C1C",
    borderWidth: 0.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: "#CCC", fontSize: 16 },

  // Avatar
  avatarSection: { alignItems: "center", marginBottom: 14 },
  avatarWrap: { position: "relative" },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "#2A2A2A",
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1C1C1C",
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#555", fontSize: 36, fontWeight: "900" },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0A0A0A",
  },
  verifiedCheck: { color: "#fff", fontSize: 11, fontWeight: "900" },

  // Name + Tags
  nameSection: {
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  athleteName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#F5F5F5",
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  tagRed: {
    backgroundColor: "#D32F2F",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagRedText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  tagDark: {
    backgroundColor: "#1C1C1C",
    borderWidth: 0.5,
    borderColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagDarkText: { color: "#CCC", fontSize: 12, fontWeight: "600" },

  // Edit button
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#1C1C1C",
    borderWidth: 0.5,
    borderColor: "#333",
    borderRadius: 10,
    paddingVertical: 11,
  },
  editBtnIcon: { color: "#CCC", fontSize: 14 },
  editBtnText: { color: "#CCC", fontSize: 14, fontWeight: "600" },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 14,
    paddingVertical: 14,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { color: "#F5F5F5", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#666", fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
  statDivider: { width: 0.5, height: 30, backgroundColor: "#2A2A2A" },

  // Bio
  bio: {
    marginHorizontal: 20,
    marginBottom: 20,
    fontSize: 13,
    color: "#999",
    lineHeight: 20,
  },

  // Endorsements
  endorseCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(139,0,0,0.18)",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 16,
    padding: 16,
  },
  endorseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  endorseTrophy: { fontSize: 18 },
  endorseTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#CCC",
    letterSpacing: 2,
  },
  endorsePending: { alignItems: "center", paddingVertical: 16, gap: 8 },
  endorsePendingIcon: { fontSize: 28 },
  endorsePendingText: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    lineHeight: 18,
  },

  // Logout
  logoutBtn: {
    marginHorizontal: 20,
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  logoutText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
});
