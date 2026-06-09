import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../src/config/api";
import { useAuth } from "../../src/context/AuthContext";

const { width, height } = Dimensions.get("window");

// ── Types ─────────────────────────────────────────────────────
interface Comment {
  id: string;
  athlete_id: string;
  name: string;
  text: string;
  created_at: string;
}

interface VideoItem {
  id: string;
  url: string;
  caption: string;
  sport: string;
  city: string;
  province: string;
  likes: number;
  comments: number;
  views: number;
  uploaded_at: string;
  athletes: {
    id: string;
    name: string;
    photo_url?: string;
    status: string;
  };
}

// ── Comments Modal ────────────────────────────────────────────
function CommentsModal({
  visible,
  videoId,
  onClose,
  athlete,
}: {
  visible: boolean;
  videoId: string | null;
  onClose: () => void;
  athlete: any;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (visible && videoId) fetchComments();
  }, [visible, videoId]);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/videos/${videoId}/comments`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments);
        setTotal(data.total);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function postComment() {
    if (!text.trim() || !athlete?.id) return;
    setPosting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/videos/${videoId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            athlete_id: athlete.id,
            name: athlete.name,
            text: text.trim(),
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setComments((p) => [data.comment, ...p]);
        setTotal((p) => p + 1);
        setText("");
      }
    } catch {
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId: string) {
    try {
      await fetch(
        `${API_BASE_URL}/api/videos/${videoId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athlete_id: athlete?.id }),
        },
      );
      setComments((p) => p.filter((c) => c.id !== commentId));
      setTotal((p) => Math.max(0, p - 1));
    } catch {}
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "just now";
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={cmtStyles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={cmtStyles.sheet}>
          <View style={cmtStyles.header}>
            <Text style={cmtStyles.headerTitle}>{total} Comments</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={cmtStyles.loading}>
              <ActivityIndicator color="#EF4444" />
            </View>
          ) : comments.length === 0 ? (
            <View style={cmtStyles.empty}>
              <Ionicons name="chatbubble-outline" size={32} color="#444" />
              <Text style={cmtStyles.emptyText}>
                No comments yet — be the first!
              </Text>
            </View>
          ) : (
            <ScrollView
              style={cmtStyles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {comments.map((c) => (
                <View key={c.id} style={cmtStyles.commentRow}>
                  <View style={cmtStyles.avatar}>
                    <Text style={cmtStyles.avatarText}>
                      {c.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={cmtStyles.commentBody}>
                    <View style={cmtStyles.commentTop}>
                      <Text style={cmtStyles.commentName}>{c.name}</Text>
                      <Text style={cmtStyles.commentTime}>
                        {timeAgo(c.created_at)}
                      </Text>
                    </View>
                    <Text style={cmtStyles.commentText}>{c.text}</Text>
                  </View>
                  {c.athlete_id === athlete?.id && (
                    <TouchableOpacity
                      onPress={() => deleteComment(c.id)}
                      activeOpacity={0.7}
                      style={cmtStyles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
          <View style={cmtStyles.inputRow}>
            <View style={cmtStyles.inputAvatar}>
              <Text style={cmtStyles.inputAvatarText}>
                {athlete?.name?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
            <TextInput
              style={cmtStyles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#444"
              value={text}
              onChangeText={setText}
              maxLength={300}
              multiline
            />
            <TouchableOpacity
              style={[
                cmtStyles.sendBtn,
                (!text.trim() || posting) && { opacity: 0.4 },
              ]}
              onPress={postComment}
              disabled={!text.trim() || posting}
              activeOpacity={0.8}
            >
              {posting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cmtStyles = StyleSheet.create({
  kav: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.75,
    borderTopWidth: 0.5,
    borderColor: "#2A2A2A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2A2A2A",
  },
  headerTitle: { color: "#F5F5F5", fontSize: 15, fontWeight: "700" },
  closeBtn: { color: "#666", fontSize: 18 },
  loading: { height: 120, alignItems: "center", justifyContent: "center" },
  empty: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: { color: "#555", fontSize: 13 },
  list: { maxHeight: height * 0.5 },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1C1C1C",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  commentBody: { flex: 1 },
  commentTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  commentName: { color: "#F5F5F5", fontSize: 13, fontWeight: "700" },
  commentTime: { color: "#555", fontSize: 11 },
  commentText: { color: "#CCC", fontSize: 13, lineHeight: 18 },
  deleteBtn: { padding: 6 },
  deleteIcon: { fontSize: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#2A2A2A",
  },
  inputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inputAvatarText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  input: {
    flex: 1,
    backgroundColor: "#1C1C1C",
    borderWidth: 0.5,
    borderColor: "#333",
    borderRadius: 20,
    color: "#F5F5F5",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: { color: "#fff", fontSize: 14 },
});

// ── Video Card ─────────────────────────────────────────────────
const VideoCard = memo(function VideoCard({
  item,
  isActive,
  athlete,
  onCommentPress,
  isFollowing,
  onFollowToggle,
  screenFocused,
  cardHeight,
}: {
  item: VideoItem;
  isActive: boolean;
  athlete: any;
  onCommentPress: (id: string) => void;
  isFollowing: boolean;
  onFollowToggle: (athleteId: string) => void;
  screenFocused: boolean;
  cardHeight: number;
}) {
  const player = useVideoPlayer(item.url, (p) => {
    p.loop = true;
    p.muted = false;
    p.playbackRate = 1.0;
  });

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [comments, setComments] = useState(item.comments ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const viewTracked = useRef(false);
  const isOwnVideo = athlete?.id === item.athletes?.id;

  // Fetch real Redis counts + like status on mount
  useEffect(() => {
    if (!athlete?.id) return;
    // Real like status + count from Redis
    fetch(`${API_BASE_URL}/api/videos/${item.id}/like?athlete_id=${athlete.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") {
          setLiked(d.liked);
          setLikes(d.likes);
        }
      })
      .catch(() => {});
    // Real view count from Redis
    fetch(`${API_BASE_URL}/api/videos/${item.id}/views`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setViews(d.views);
      })
      .catch(() => {});
  }, [item.id, athlete?.id]);

  // Play/pause — respects both active index AND screen focus
  useEffect(() => {
    if (isActive && screenFocused) {
      player.play();
      if (!viewTracked.current) {
        viewTracked.current = true;
        fetch(`${API_BASE_URL}/api/videos/${item.id}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athlete_id: athlete?.id }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.status === "success") setViews(d.views);
          })
          .catch(() => {});
      }
    } else {
      // Pause when scrolled away OR when navigating to another tab
      player.pause();
    }
  }, [isActive, screenFocused]);

  async function handleLike() {
    if (!athlete?.id || likeLoading) return;
    setLikeLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((p) => (wasLiked ? Math.max(0, p - 1) : p + 1));
    try {
      const res = await fetch(`${API_BASE_URL}/api/videos/${item.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete_id: athlete.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikes(data.likes);
      } else {
        setLiked(wasLiked);
        setLikes((p) => (wasLiked ? p + 1 : Math.max(0, p - 1)));
      }
    } catch {
      setLiked(wasLiked);
      setLikes((p) => (wasLiked ? p + 1 : Math.max(0, p - 1)));
    } finally {
      setLikeLoading(false);
    }
  }

  function fmt(n: number) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  function formatSport(s: string) {
    return s?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatHandle(name: string) {
    return "@" + name?.toLowerCase().replace(/\s+/g, "_");
  }

  return (
    <View style={[styles.videoCard, { height: cardHeight }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Right action bar */}
      <View style={styles.actionBar}>
        {/* Like */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleLike}
          activeOpacity={0.8}
          disabled={likeLoading}
        >
          <View
            style={[styles.actionIconWrap, liked && styles.actionIconWrapLiked]}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? "#EF4444" : "#fff"}
            />
          </View>
          <Text style={styles.actionCount}>{fmt(likes)}</Text>
        </TouchableOpacity>

        {/* Comments */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onCommentPress(item.id)}
          activeOpacity={0.8}
        >
          <View style={styles.actionIconWrap}>
            <Image
              source={require("../../assets/icons/chat.png")}
              style={styles.actionIconImg}
            />
          </View>
          <Text style={styles.actionCount}>{fmt(comments)}</Text>
        </TouchableOpacity>

        {/* Views */}
        <View style={styles.actionBtn}>
          <View style={styles.actionIconWrap}>
            <Image
              source={require("../../assets/icons/eye.png")}
              style={styles.actionIconImg}
            />
          </View>
          <Text style={styles.actionCount}>{fmt(views)}</Text>
        </View>
      </View>

      {/* Bottom info */}
      <View style={styles.videoInfo}>
        <View style={styles.userRow}>
          {item.athletes?.photo_url ? (
            <Image
              source={{ uri: item.athletes.photo_url }}
              style={styles.avatarSmall}
            />
          ) : (
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>
                {item.athletes?.name?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          <Text style={styles.username}>
            {formatHandle(item.athletes?.name ?? "athlete")}
          </Text>
          {item.athletes?.status === "approved" && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={9} color="#fff" />
            </View>
          )}
          {/* Follow button — hidden on own videos */}
          {!isOwnVideo && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={() => onFollowToggle(item.athletes?.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.followBtnText,
                  isFollowing && styles.followBtnTextActive,
                ]}
              >
                {isFollowing ? "Following" : "+ Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {item.caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {item.caption}
          </Text>
        ) : null}
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
});

// ── Home Screen ───────────────────────────────────────────────
export default function HomeScreen() {
  const { athlete } = useAuth();
  const insets = useSafeAreaInsets();
  // Exact tab bar height mirrors _layout.tsx: bar(52) + paddingBottom + border(0.5)
  const tabBarHeight =
    52 + Math.max(insets.bottom, Platform.OS === "android" ? 8 : 4) + 0.5;
  const [cardHeight, setCardHeight] = useState(height - tabBarHeight);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("For You");
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState("");
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
  const [screenFocused, setScreenFocused] = useState(true);

  // Pause video when navigating away, resume when coming back
  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => {
        // Cleanup — called when screen loses focus
        setScreenFocused(false);
      };
    }, []),
  );

  // ── Shared follow state map: athleteId → boolean ─────────────
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const followMapRef = useRef(followMap);
  useEffect(() => { followMapRef.current = followMap; }, [followMap]);

  // Fetch initial follow status for all unique athletes in feed
  async function fetchFollowStatuses(videoList: VideoItem[]) {
    if (!athlete?.id) return;
    const uniqueAthleteIds = [
      ...new Set(
        videoList
          .map((v) => v.athletes?.id)
          .filter((id) => id && id !== athlete.id),
      ),
    ];

    const results = await Promise.allSettled(
      uniqueAthleteIds.map(async (athleteId) => {
        const res = await fetch(
          `${API_BASE_URL}/api/athletes/${athleteId}/stats?athlete_id=${athlete.id}`,
        );
        const data = await res.json();
        return { athleteId, isFollowing: res.ok ? data.isFollowing : false };
      }),
    );
    const batch: Record<string, boolean> = {};
    results.forEach((r) => {
      if (r.status === "fulfilled") batch[r.value.athleteId] = r.value.isFollowing;
    });
    if (Object.keys(batch).length > 0) {
      setFollowMap((prev) => ({ ...prev, ...batch }));
    }
  }

  // Toggle follow — stable callback, reads followMap via ref to avoid stale closure
  const handleFollowToggle = useCallback(async (targetAthleteId: string) => {
    if (!athlete?.id || !targetAthleteId) return;
    const wasFollowing = !!followMapRef.current[targetAthleteId];
    setFollowMap((prev) => ({ ...prev, [targetAthleteId]: !wasFollowing }));
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/athletes/${targetAthleteId}/follow`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athlete_id: athlete.id }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setFollowMap((prev) => ({ ...prev, [targetAthleteId]: data.following }));
      } else {
        setFollowMap((prev) => ({ ...prev, [targetAthleteId]: wasFollowing }));
      }
    } catch {
      setFollowMap((prev) => ({ ...prev, [targetAthleteId]: wasFollowing }));
    }
  }, [athlete?.id]);

  const fetchControllerRef = useRef<AbortController | null>(null);

  const fetchVideos = useCallback(
    async (category: string, isRefresh = false) => {
      // Cancel any in-flight request
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
      fetchControllerRef.current = new AbortController();

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        let url = `${API_BASE_URL}/api/videos`;
        const params = new URLSearchParams();

        if (category === "For You") {
          // Pass viewer_id only — backend handles 60/40 split
          // Do NOT pass sport — For You should cross all sports
          if (athlete?.id) params.set("viewer_id", athlete.id);
        } else if (category === "Trending") {
          // Sort by views — backend handles this
          params.set("trending", "true");
        } else {
          // Sport tab — convert display name to DB value (e.g. "Table Tennis" → "table_tennis")
          params.set("sport", category.toLowerCase().replace(/\s+/g, "_"));
        }

        const qs = params.toString();
        if (qs) url += `?${qs}`;

        const response = await fetch(url, {
          signal: fetchControllerRef.current?.signal,
        });
        const data = await response.json();
        if (response.ok) {
          setVideos(data.data ?? []);
          fetchFollowStatuses(data.data ?? []);
        } else {
          setError("Could not load feed.");
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") setError("Cannot reach server.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [athlete?.id, athlete?.sport],
  );

  useEffect(() => {
    fetchVideos(activeCategory);
  }, [activeCategory]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
    },
    [],
  );

  // Preload next video URL so it's ready before user scrolls to it
  const nextVideoUrl = videos[activeIndex + 1]?.url;
  useEffect(() => {
    if (!nextVideoUrl) return;
    // Trigger a HEAD request to warm up the CDN/connection
    fetch(nextVideoUrl, { method: "HEAD" }).catch(() => {});
  }, [nextVideoUrl]);

  const handleCommentPress = useCallback((id: string) => setCommentVideoId(id), []);

  const CATEGORIES = ["For You", "Trending"];

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) setCardHeight(h);
      }}
    >
      <StatusBar hidden={true} />

      {/* Category pills — centered, only For You + Trending */}
      <View style={[styles.categories, { top: insets.top + 8 }]}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.catPill, activeCategory === c && styles.catPillActive]}
            onPress={() => {
              setActiveCategory(c);
              setActiveIndex(0);
            }}
            activeOpacity={0.8}
          >
            {c === "For You" && <MaterialCommunityIcons name="fire" size={13} color={activeCategory === "For You" ? "#D32F2F" : "#EF4444"} style={{ marginRight: 4 }} />}
            <Text style={[styles.catText, activeCategory === c && styles.catTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#EF4444" size="large" />
          <Text style={styles.loadingText}>Loading your feed...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
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
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="trophy-outline" size={48} color="#EF4444" />
          <Text style={styles.emptyTitle}>No videos yet</Text>
          <Text style={styles.emptyText}>
            {activeCategory === "For You"
              ? `Be the first to post a ${athlete?.sport?.replace(/_/g, " ") ?? "sports"} video!`
              : `No ${activeCategory} videos yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1, backgroundColor: "#000" }}
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <VideoCard
              item={item}
              isActive={index === activeIndex}
              athlete={athlete}
              onCommentPress={handleCommentPress}
              isFollowing={!!followMap[item.athletes?.id]}
              onFollowToggle={handleFollowToggle}
              screenFocused={screenFocused}
              cardHeight={cardHeight}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, index) => ({
            length: cardHeight,
            offset: cardHeight * index,
            index,
          })}
          refreshing={refreshing}
          onRefresh={() => fetchVideos(activeCategory, true)}
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          windowSize={3}
        />
      )}

      <CommentsModal
        visible={!!commentVideoId}
        videoId={commentVideoId}
        onClose={() => setCommentVideoId(null)}
        athlete={athlete}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },

  categories: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
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
  catText: { color: "#CCC", fontSize: 13, fontWeight: "600" },
  catTextActive: { color: "#0A0A0A" },

  videoCard: { width, height, backgroundColor: "#000", overflow: "hidden" },
  video: { ...StyleSheet.absoluteFillObject },

  actionBar: {
    position: "absolute",
    right: 14,
    bottom: 90,
    alignItems: "center",
    gap: 18,
  },
  actionBtn: { alignItems: "center", gap: 5 },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconWrapLiked: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderColor: "rgba(239,68,68,0.4)",
  },
  actionIcon: { fontSize: 20, color: "#fff" },
  actionIconLiked: { color: "#EF4444" },
  actionIconImg: { width: 22, height: 22, tintColor: "#FFFFFF" },
  actionCount: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  videoInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 70,
    padding: 16,
    paddingBottom: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
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
    overflow: "hidden",
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

  followBtn: {
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  followBtnActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  followBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  followBtnTextActive: { color: "rgba(255,255,255,0.6)" },

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
