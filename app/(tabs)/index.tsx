import { ResizeMode, Video } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { API_BASE_URL } from "../../src/config/api";
import { useAuth } from "../../src/context/AuthContext";

const { width, height } = Dimensions.get("window");

// ── Types ─────────────────────────────────────────────────────
interface VideoItem {
  id: string;
  url: string;
  caption: string;
  sport: string;
  city: string;
  province: string;
  likes: number;
  comments: number;
  shares: number;
  uploaded_at: string;
  athletes: {
    id: string;
    name: string;
    photo_url?: string;
    status: string;
  };
}

const CATEGORIES = [
  "For You",
  "Trending",
  "Cricket",
  "Football",
  "Boxing",
  "Athletics",
  "Swimming",
];

// ── Single video card ─────────────────────────────────────────
function VideoCard({ item, isActive }: { item: VideoItem; isActive: boolean }) {
  const videoRef = useRef<Video>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.playAsync();
    } else {
      videoRef.current.pauseAsync();
    }
  }, [isActive]);

  function formatHandle(name: string) {
    return "@" + name?.toLowerCase().replace(/\s+/g, "_");
  }

  function formatCount(n: number) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  function formatSport(s: string) {
    return s?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <View style={styles.videoCard}>
      {/* ── Video player ── */}
      <Video
        ref={videoRef}
        source={{ uri: item.url }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={isActive}
        isMuted={false}
      />

      {/* ── Dark gradient overlay ── */}
      <View style={styles.overlay} />

      {/* ── Right action bar ── */}
      <View style={styles.actionBar}>
        {/* Like */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setLiked((p) => !p)}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionIcon, liked && styles.actionIconActive]}>
            ♥
          </Text>
          <Text style={styles.actionCount}>
            {formatCount(item.likes + (liked ? 1 : 0))}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{formatCount(item.comments)}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <Text style={styles.actionIcon}>⬆</Text>
          <Text style={styles.actionCount}>{formatCount(item.shares)}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setSaved((p) => !p)}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionIcon, saved && styles.actionIconActive]}>
            🔖
          </Text>
          <Text style={styles.actionCount}>{saved ? "Saved" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bottom info ── */}
      <View style={styles.videoInfo}>
        {/* User row */}
        <View style={styles.userRow}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>
              {item.athletes?.name?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={styles.username}>
            {formatHandle(item.athletes?.name ?? "athlete")}
          </Text>
          {item.athletes?.status === "approved" && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedCheck}>✓</Text>
            </View>
          )}
        </View>

        {/* Caption */}
        {item.caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {item.caption}
          </Text>
        ) : null}

        {/* Tags row */}
        <View style={styles.tagsRow}>
          {item.sport ? (
            <View style={styles.tagRed}>
              <Text style={styles.tagRedText}>{formatSport(item.sport)}</Text>
            </View>
          ) : null}
          {item.city ? (
            <View style={styles.tagDark}>
              <Text style={styles.tagDarkText}>{item.city}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ── Main Home Screen ──────────────────────────────────────────
export default function HomeScreen() {
  const { athlete } = useAuth();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("For You");
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState("");

  // Fetch feed based on sport filter
  const fetchVideos = useCallback(
    async (category: string, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        // "For You" = athlete's own sport, "Trending" = no filter (all sports)
        let sportParam = "";
        if (category === "For You" && athlete?.sport) {
          sportParam = `?sport=${athlete.sport}`;
        } else if (!["For You", "Trending"].includes(category)) {
          sportParam = `?sport=${category.toLowerCase()}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/videos${sportParam}`);
        const data = await response.json();

        if (response.ok) {
          setVideos(data.data ?? []);
        } else {
          setError("Could not load feed.");
        }
      } catch {
        setError("Cannot reach server. Make sure backend is running.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [athlete?.sport],
  );

  useEffect(() => {
    fetchVideos(activeCategory);
  }, [activeCategory]);

  // Track which video is visible
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    },
    [],
  );

  const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

  // ── Empty state ──────────────────────────────────────────────
  function EmptyFeed() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🏅</Text>
        <Text style={styles.emptyTitle}>No videos yet</Text>
        <Text style={styles.emptyText}>
          {activeCategory === "For You"
            ? `Be the first to post a ${athlete?.sport?.replace(/_/g, " ")} video!`
            : `No ${activeCategory} videos yet. Check back soon!`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />

      {/* Category pills — float over feed */}
      <View style={styles.categories}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.catPill,
                activeCategory === c && styles.catPillActive,
              ]}
              onPress={() => {
                setActiveCategory(c);
                setActiveIndex(0);
              }}
              activeOpacity={0.8}
            >
              {c === "For You" && <Text style={styles.catFire}>🔥 </Text>}
              <Text
                style={[
                  styles.catText,
                  activeCategory === c && styles.catTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#EF4444" size="large" />
          <Text style={styles.loadingText}>Loading your feed...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Connection Error</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchVideos(activeCategory)}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : videos.length === 0 ? (
        <EmptyFeed />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <VideoCard item={item} isActive={index === activeIndex} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          refreshing={refreshing}
          onRefresh={() => fetchVideos(activeCategory, true)}
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={5}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },

  // Categories
  categories: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  catScroll: { paddingHorizontal: 14, gap: 8 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,20,0.85)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: "#333",
  },
  catPillActive: { backgroundColor: "#fff" },
  catFire: { fontSize: 12 },
  catText: { color: "#CCC", fontSize: 13, fontWeight: "600" },
  catTextActive: { color: "#0A0A0A" },

  // Video card
  videoCard: {
    width,
    height,
    backgroundColor: "#111",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    // Gradient-like effect using multiple layers
    borderBottomWidth: 0,
  },

  // Action bar
  actionBar: {
    position: "absolute",
    right: 14,
    bottom: 130,
    alignItems: "center",
    gap: 20,
  },
  actionBtn: { alignItems: "center", gap: 4 },
  actionIcon: { fontSize: 30, color: "#fff" },
  actionIconActive: { color: "#EF4444" },
  actionCount: { fontSize: 12, color: "#fff", fontWeight: "600" },

  // Video info
  videoInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 80,
    padding: 16,
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D32F2F",
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  username: { color: "#fff", fontSize: 15, fontWeight: "700" },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedCheck: { color: "#fff", fontSize: 9, fontWeight: "900" },
  caption: { color: "#fff", fontSize: 13, lineHeight: 18, marginBottom: 8 },
  tagsRow: { flexDirection: "row", gap: 6 },
  tagRed: {
    backgroundColor: "#D32F2F",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagRedText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  tagDark: {
    backgroundColor: "rgba(30,30,30,0.9)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: "#444",
  },
  tagDarkText: { color: "#CCC", fontSize: 11 },

  // Loading / empty / error
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { color: "#666", fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { color: "#F5F5F5", fontSize: 20, fontWeight: "800" },
  emptyText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: "#D32F2F",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
