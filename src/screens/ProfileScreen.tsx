import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");
const THUMB_SIZE = (width - 52) / 3;

// ── Types ────────────────────────────────────────────────────
interface VideoItem {
  id: string;
  url: string;
  caption: string;
  sport: string;
  likes: number;
  views: number;
  uploaded_at: string;
}

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

// ── Video thumbnail card ──────────────────────────────────────
function VideoThumb({ item, onPress }: { item: VideoItem; onPress: () => void }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    VideoThumbnails.getThumbnailAsync(item.url, { time: 0 })
      .then(({ uri }) => { if (!cancelled) setThumb(uri); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [item.url]);

  function fmt(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  return (
    <TouchableOpacity style={vGrid.card} onPress={onPress} activeOpacity={0.85}>
      <View style={vGrid.bg}>
        {loading ? (
          <ActivityIndicator color="#EF4444" size="small" />
        ) : thumb ? (
          <Image source={{ uri: thumb }} style={vGrid.img} />
        ) : (
          <Ionicons name="videocam-outline" size={28} color="#333" />
        )}
        <View style={vGrid.playOverlay}>
          <View style={vGrid.playCircle}>
            <Ionicons name="play" size={12} color="#fff" />
          </View>
        </View>
        <View style={vGrid.viewsBadge}>
          <Ionicons name="eye-outline" size={9} color="#fff" />
          <Text style={vGrid.viewsText}>{fmt(item.views ?? 0)}</Text>
        </View>
      </View>
      {item.caption ? (
        <Text style={vGrid.caption} numberOfLines={1}>{item.caption}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const vGrid = StyleSheet.create({
  card: { width: THUMB_SIZE },
  bg: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.4,
    backgroundColor: "#1C1C1C",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  img: { width: THUMB_SIZE, height: THUMB_SIZE * 1.4, borderRadius: 8, resizeMode: "cover" },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  playCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  viewsBadge: {
    position: "absolute", bottom: 5, left: 5,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
  },
  viewsText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  caption: { color: "#666", fontSize: 10, paddingHorizontal: 2, paddingTop: 3 },
});

// ── Full-screen video card for feed modal ─────────────────────
function VideoFeedCard({
  video,
  isActive,
  athlete,
}: {
  video: VideoItem;
  isActive: boolean;
  athlete: any;
}) {
  const player = useVideoPlayer(video.url, (p) => {
    p.loop = true;
    p.muted = false;
  });
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(video.likes ?? 0);
  const [views, setViews] = useState(video.views ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    if (!athlete?.id) return;
    fetch(`${API_BASE_URL}/api/videos/${video.id}/like?athlete_id=${athlete.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.status === "success") { setLiked(d.liked); setLikes(d.likes); } })
      .catch(() => {});
    fetch(`${API_BASE_URL}/api/videos/${video.id}/views`)
      .then((r) => r.json())
      .then((d) => { if (d.status === "success") setViews(d.views); })
      .catch(() => {});
  }, [video.id, athlete?.id]);

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive]);

  async function handleLike() {
    if (!athlete?.id || likeLoading) return;
    setLikeLoading(true);
    const was = liked;
    setLiked(!was);
    setLikes((p) => (was ? Math.max(0, p - 1) : p + 1));
    try {
      const res = await fetch(`${API_BASE_URL}/api/videos/${video.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete_id: athlete.id }),
      });
      const d = await res.json();
      if (res.ok) { setLiked(d.liked); setLikes(d.likes); }
      else { setLiked(was); setLikes((p) => (was ? p + 1 : Math.max(0, p - 1))); }
    } catch {
      setLiked(was);
      setLikes((p) => (was ? p + 1 : Math.max(0, p - 1)));
    } finally {
      setLikeLoading(false);
    }
  }

  function fmt(n: number) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  return (
    <View style={{ width, height, backgroundColor: "#0A0A0A" }}>
      <VideoView player={player} style={{ width, height }} contentFit="cover" nativeControls={false} />

      <View style={feedSt.actionBar}>
        <View style={feedSt.avatarWrap}>
          {athlete?.photo_url ? (
            <Image source={{ uri: athlete.photo_url }} style={feedSt.avatarImg} />
          ) : (
            <View style={feedSt.avatar}>
              <Text style={feedSt.avatarText}>{athlete?.name?.charAt(0).toUpperCase() ?? "?"}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={feedSt.actionBtn} onPress={handleLike} disabled={likeLoading} activeOpacity={0.8}>
          <View style={[feedSt.iconWrap, liked && feedSt.iconWrapLiked]}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#EF4444" : "#fff"} />
          </View>
          <Text style={feedSt.count}>{fmt(likes)}</Text>
        </TouchableOpacity>
        <View style={feedSt.actionBtn}>
          <View style={feedSt.iconWrap}>
            <Ionicons name="eye-outline" size={20} color="#fff" />
          </View>
          <Text style={feedSt.count}>{fmt(views)}</Text>
        </View>
      </View>

      <View style={feedSt.info}>
        <View style={feedSt.userRow}>
          <Text style={feedSt.handle}>{"@" + (athlete?.name ?? "").toLowerCase().replace(/\s+/g, "_")}</Text>
          {athlete?.status === "approved" && (
            <View style={feedSt.verifiedBadge}>
              <Ionicons name="checkmark" size={9} color="#fff" />
            </View>
          )}
        </View>
        {video.caption ? <Text style={feedSt.caption} numberOfLines={2}>{video.caption}</Text> : null}
        {video.sport ? (
          <View style={feedSt.tag}>
            <Text style={feedSt.tagText}>
              {video.sport.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const feedSt = StyleSheet.create({
  actionBar: { position: "absolute", right: 12, bottom: 100, alignItems: "center", gap: 20 },
  avatarWrap: { marginBottom: 4 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#D32F2F", borderWidth: 2, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#fff" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  actionBtn: { alignItems: "center", gap: 5 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  iconWrapLiked: { backgroundColor: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.5)" },
  count: { fontSize: 11, color: "#fff", fontWeight: "700" },
  info: { position: "absolute", bottom: 0, left: 0, right: 70, padding: 16, paddingBottom: 20 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  handle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#D32F2F", alignItems: "center", justifyContent: "center",
  },
  caption: { color: "#fff", fontSize: 13, lineHeight: 18, marginBottom: 8 },
  tag: { alignSelf: "flex-start", backgroundColor: "#D32F2F", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

// ── Video feed modal ──────────────────────────────────────────
function VideoFeedModal({
  visible,
  videos,
  startIndex,
  onClose,
  athlete,
}: {
  visible: boolean;
  videos: VideoItem[];
  startIndex: number;
  onClose: () => void;
  athlete: any;
}) {
  const { top } = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setActiveIndex(startIndex);
      setTimeout(() => flatRef.current?.scrollToIndex({ index: startIndex, animated: false }), 50);
    }
  }, [visible, startIndex]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar hidden={true} />
        <TouchableOpacity
          style={{
            position: "absolute", top: top + 12, left: 16, zIndex: 10,
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center", justifyContent: "center",
          }}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ position: "absolute", top: top + 16, left: 60, right: 60, zIndex: 10, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>MY VIDEOS</Text>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>
            {activeIndex + 1} / {videos.length}
          </Text>
        </View>
        <FlatList
          ref={flatRef}
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <VideoFeedCard video={item} isActive={index === activeIndex} athlete={athlete} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={5}
          initialScrollIndex={startIndex}
        />
      </View>
    </Modal>
  );
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
        <Ionicons name="share-social-outline" size={15} color="#CCC" />
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
});

// ── Main Screen ───────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { athlete: contextAthlete, updateAthlete, logout } = useAuth();
  const [athlete, setAthleteLocal] = useState<Athlete | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, videos: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);

  useEffect(() => {
    if (contextAthlete) {
      setAthleteLocal(contextAthlete);
    } else if (params.athlete) {
      try {
        setAthleteLocal(JSON.parse(params.athlete as string));
      } catch {}
    }
  }, [contextAthlete, params.athlete]);

  // Fetch stats function — reusable for both auto and manual refresh
  const fetchStats = useCallback(
    async (isRefresh = false) => {
      if (!athlete?.id) return;
      if (isRefresh) setRefreshing(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/athletes/${athlete.id}/stats`,
        );
        const data = await res.json();
        if (data.status === "success") {
          setStats({
            followers: data.followers,
            following: data.following,
            videos: data.videos,
          });
        }
      } catch {
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [athlete?.id],
  );

  const fetchMyVideos = useCallback(async () => {
    if (!athlete?.id) return;
    setLoadingVideos(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/videos/mine?athlete_id=${athlete.id}`);
      const data = await res.json();
      if (res.ok && data.data) setMyVideos(data.data);
    } catch {
    } finally {
      setLoadingVideos(false);
    }
  }, [athlete?.id]);

  // Fetch on mount when athlete loads
  useEffect(() => {
    fetchStats();
    fetchMyVideos();
  }, [fetchStats, fetchMyVideos]);

  // Re-fetch every time user navigates back to this screen
  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchMyVideos();
    }, [fetchStats, fetchMyVideos]),
  );

  if (!athlete) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const followers = stats.followers;
  const following = stats.following;
  const videos = stats.videos;
  const city = athlete.city ?? "";
  const bio = athlete.bio ?? athlete.achievements ?? "";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar hidden={true} />

      <VideoFeedModal
        visible={feedOpen}
        videos={myVideos}
        startIndex={feedStartIndex}
        onClose={() => setFeedOpen(false)}
        athlete={athlete}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { fetchStats(true); fetchMyVideos(); }}
            tintColor="#EF4444"
            colors={["#EF4444"]}
          />
        }
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Text style={styles.handle}>{formatHandle(athlete.name)}</Text>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={18} color="#CCC" />
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
              <Ionicons name="settings-outline" size={18} color="#CCC" />
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
              <Ionicons name="checkmark" size={11} color="#fff" />
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
          <Ionicons name="pencil-outline" size={15} color="#CCC" />
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

        {/* ── Videos ── */}
        <Text style={styles.sectionLabel}>MY VIDEOS</Text>
        {loadingVideos ? (
          <View style={styles.videosLoading}>
            <ActivityIndicator color="#EF4444" size="small" />
          </View>
        ) : myVideos.length === 0 ? (
          <View style={styles.videosEmpty}>
            <Ionicons name="videocam-outline" size={36} color="#333" />
            <Text style={styles.videosEmptyText}>No videos yet — go post your first one!</Text>
          </View>
        ) : (
          <View style={styles.videosGrid}>
            {myVideos.map((video, index) => (
              <VideoThumb
                key={video.id}
                item={video}
                onPress={() => {
                  setFeedStartIndex(index);
                  setFeedOpen(true);
                }}
              />
            ))}
          </View>
        )}

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
            <MaterialCommunityIcons name="trophy" size={18} color="#EF4444" />
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
              <Ionicons name="time-outline" size={32} color="#555" />
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
    </SafeAreaView>
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
    paddingTop: 8,
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

  // Videos grid
  videosLoading: { height: 100, alignItems: "center", justifyContent: "center" },
  videosEmpty: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#222",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  videosEmptyText: { color: "#555", fontSize: 13, textAlign: "center" },
  videosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 20,
  },

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
  endorseTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#CCC",
    letterSpacing: 2,
  },
  endorsePending: { alignItems: "center", paddingVertical: 16, gap: 8 },
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
