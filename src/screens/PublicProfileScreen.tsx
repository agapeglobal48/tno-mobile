import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");
const THUMB = (width - 52) / 3;

// ── Types ─────────────────────────────────────────────────────
interface PublicAthlete {
  id: string;
  name: string;
  sport: string;
  city?: string;
  province?: string;
  bio?: string;
  achievements?: string;
  photo_url?: string;
  status: string;
}

interface VideoItem {
  id: string;
  url: string;
  caption: string;
  sport: string;
  city: string;
  likes: number;
  views: number;
  comments: number;
  uploaded_at: string;
  thumbnail?: string;
}

// ── Video thumbnail ───────────────────────────────────────────
function VideoThumb({
  item,
  onPress,
}: {
  item: VideoItem;
  onPress: () => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    VideoThumbnails.getThumbnailAsync(item.url, { time: 0 })
      .then(({ uri }) => {
        if (!cancelled) setThumb(uri);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.url]);

  function fmt(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  return (
    <TouchableOpacity
      style={styles.thumbCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.thumbBg}>
        {loading ? (
          <ActivityIndicator color="#EF4444" size="small" />
        ) : thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumbImg} />
        ) : (
          <Ionicons name="videocam-outline" size={28} color="#333" />
        )}
        <View style={styles.thumbPlayOverlay}>
          <View style={styles.thumbPlayCircle}>
            <Ionicons name="play" size={12} color="#fff" />
          </View>
        </View>
        <View style={styles.thumbViewsBadge}>
          <View style={styles.thumbViewsRow}>
            <Ionicons name="eye-outline" size={9} color="#fff" />
            <Text style={styles.thumbViews}>{fmt(item.views ?? 0)}</Text>
          </View>
        </View>
      </View>
      {item.caption ? (
        <Text style={styles.thumbCaption} numberOfLines={1}>
          {item.caption}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ── Comments sheet (reusable) ─────────────────────────────────
function CommentsSheet({
  visible,
  videoId,
  onClose,
  viewer,
}: {
  visible: boolean;
  videoId: string | null;
  onClose: () => void;
  viewer: any;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (visible && videoId) {
      setLoading(true);
      fetch(`${API_BASE_URL}/api/videos/${videoId}/comments`)
        .then((r) => r.json())
        .then((d) => {
          if (d.status === "success") {
            setComments(d.comments);
            setTotal(d.total);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible, videoId]);

  async function postComment() {
    if (!text.trim() || !viewer?.id) return;
    setPosting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/videos/${videoId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            athlete_id: viewer.id,
            name: viewer.name,
            text: text.trim(),
          }),
        },
      );
      const d = await res.json();
      if (res.ok) {
        setComments((p) => [d.comment, ...p]);
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
          body: JSON.stringify({ athlete_id: viewer?.id }),
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={cStyles.kav}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={cStyles.sheet}>
        <View style={cStyles.header}>
          <Text style={cStyles.headerTitle}>{total} Comments</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color="#666" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={cStyles.center}>
            <ActivityIndicator color="#EF4444" />
          </View>
        ) : comments.length === 0 ? (
          <View style={cStyles.center}>
            <Text style={cStyles.emptyText}>
              No comments yet — be the first!
            </Text>
          </View>
        ) : (
          <ScrollView style={cStyles.list} showsVerticalScrollIndicator={false}>
            {comments.map((c) => (
              <View key={c.id} style={cStyles.row}>
                <View style={cStyles.avatar}>
                  <Text style={cStyles.avatarText}>
                    {c.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={cStyles.body}>
                  <View style={cStyles.top}>
                    <Text style={cStyles.name}>{c.name}</Text>
                    <Text style={cStyles.time}>{timeAgo(c.created_at)}</Text>
                  </View>
                  <Text style={cStyles.commentText}>{c.text}</Text>
                </View>
                {c.athlete_id === viewer?.id && (
                  <TouchableOpacity
                    onPress={() => deleteComment(c.id)}
                    style={cStyles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={14} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
        <View style={cStyles.inputRow}>
          <View style={cStyles.inputAvatar}>
            <Text style={cStyles.inputAvatarText}>
              {viewer?.name?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <TextInput
            style={cStyles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#444"
            value={text}
            onChangeText={setText}
            maxLength={300}
            multiline
          />
          <TouchableOpacity
            style={[
              cStyles.sendBtn,
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

const cStyles = StyleSheet.create({
  kav: { flex: 1, justifyContent: "flex-end" },
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
  center: { height: 120, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#555", fontSize: 13 },
  list: { maxHeight: height * 0.45 },
  row: {
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
  body: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  name: { color: "#F5F5F5", fontSize: 13, fontWeight: "700" },
  time: { color: "#555", fontSize: 11 },
  commentText: { color: "#CCC", fontSize: 13, lineHeight: 18 },
  deleteBtn: { padding: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
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
});

// ── Full-screen video card ────────────────────────────────────
function VideoCard({
  video,
  isActive,
  viewer,
  onCommentPress,
}: {
  video: VideoItem;
  isActive: boolean;
  viewer: any;
  onCommentPress: (id: string) => void;
}) {
  const player = useVideoPlayer(video.url, (p) => {
    p.loop = true;
    p.muted = false;
  });
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(video.likes ?? 0);
  const [views, setViews] = useState(0);
  const [comments, setComments] = useState(video.comments ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const viewTracked = useRef(false);

  // Fetch real likes + real Redis views on mount
  useEffect(() => {
    if (!viewer?.id) return;
    fetch(`${API_BASE_URL}/api/videos/${video.id}/like?athlete_id=${viewer.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") {
          setLiked(d.liked);
          setLikes(d.likes);
        }
      })
      .catch(() => {});
    // Fetch real view count from Redis via the views endpoint
    fetch(`${API_BASE_URL}/api/videos/${video.id}/views`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setViews(d.views);
      })
      .catch(() => {});
  }, [video.id, viewer?.id]);

  useEffect(() => {
    if (isActive) {
      player.play();
      // Track view once
      if (!viewTracked.current && viewer?.id) {
        viewTracked.current = true;
        fetch(`${API_BASE_URL}/api/videos/${video.id}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athlete_id: viewer.id }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.status === "success") setViews(d.views);
          })
          .catch(() => {});
      }
    } else {
      player.pause();
    }
  }, [isActive]);

  async function handleLike() {
    if (!viewer?.id || likeLoading) return;
    setLikeLoading(true);
    const was = liked;
    setLiked(!was);
    setLikes((p) => (was ? Math.max(0, p - 1) : p + 1));
    try {
      const res = await fetch(`${API_BASE_URL}/api/videos/${video.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete_id: viewer.id }),
      });
      const d = await res.json();
      if (res.ok) {
        setLiked(d.liked);
        setLikes(d.likes);
      } else {
        setLiked(was);
        setLikes((p) => (was ? p + 1 : Math.max(0, p - 1)));
      }
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
    <View style={vStyles.card}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={vStyles.actionBar}>
        {/* Like */}
        <TouchableOpacity
          style={vStyles.actionBtn}
          onPress={handleLike}
          disabled={likeLoading}
          activeOpacity={0.8}
        >
          <View style={[vStyles.iconWrap, liked && vStyles.iconWrapLiked]}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? "#EF4444" : "#fff"}
            />
          </View>
          <Text style={vStyles.count}>{fmt(likes)}</Text>
        </TouchableOpacity>
        {/* Comments */}
        <TouchableOpacity
          style={vStyles.actionBtn}
          onPress={() => onCommentPress(video.id)}
          activeOpacity={0.8}
        >
          <View style={vStyles.iconWrap}>
            <Image
              source={require("../../assets/icons/chat.png")}
              style={vStyles.iconImg}
            />
          </View>
          <Text style={vStyles.count}>{fmt(comments)}</Text>
        </TouchableOpacity>
        {/* Views */}
        <View style={vStyles.actionBtn}>
          <View style={vStyles.iconWrap}>
            <Image
              source={require("../../assets/icons/eye.png")}
              style={vStyles.iconImg}
            />
          </View>
          <Text style={vStyles.count}>{fmt(views)}</Text>
        </View>
      </View>
      <View style={vStyles.info}>
        {video.caption ? (
          <Text style={vStyles.caption} numberOfLines={2}>
            {video.caption}
          </Text>
        ) : null}
        {video.sport ? (
          <View style={vStyles.tag}>
            <Text style={vStyles.tagText}>
              {video.sport
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const vStyles = StyleSheet.create({
  card: { width, height, backgroundColor: "#0A0A0A" },
  video: { ...StyleSheet.absoluteFillObject },
  actionBar: {
    position: "absolute",
    right: 12,
    bottom: 100,
    alignItems: "center",
    gap: 20,
  },
  actionBtn: { alignItems: "center", gap: 5 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapLiked: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderColor: "rgba(239,68,68,0.5)",
  },
  iconImg: { width: 22, height: 22, tintColor: "#fff" },
  count: { fontSize: 11, color: "#fff", fontWeight: "700" },
  info: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 70,
    padding: 16,
    paddingBottom: 20,
  },
  caption: { color: "#fff", fontSize: 13, lineHeight: 18, marginBottom: 8 },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#D32F2F",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

// ── Video feed modal ──────────────────────────────────────────
function VideoFeedModal({
  visible,
  videos,
  startIndex,
  onClose,
  viewer,
}: {
  visible: boolean;
  videos: VideoItem[];
  startIndex: number;
  onClose: () => void;
  viewer: any;
}) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setActiveIndex(startIndex);
      setTimeout(
        () =>
          flatRef.current?.scrollToIndex({
            index: startIndex,
            animated: false,
          }),
        50,
      );
    }
  }, [visible, startIndex]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar hidden={true} />
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 20,
            left: 16,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#fff", fontSize: 20, marginTop: -2 }}>←</Text>
        </TouchableOpacity>
        <View
          style={{
            position: "absolute",
            top: 24,
            left: 60,
            right: 60,
            zIndex: 10,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {activeIndex + 1} / {videos.length}
          </Text>
        </View>
        <FlatList
          ref={flatRef}
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <VideoCard
              video={item}
              isActive={index === activeIndex}
              viewer={viewer}
              onCommentPress={(id) => setCommentVideoId(id)}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={5}
          initialScrollIndex={startIndex}
        />
        {/* Comments sheet inside the modal */}
        <CommentsSheet
          visible={!!commentVideoId}
          videoId={commentVideoId}
          onClose={() => setCommentVideoId(null)}
          viewer={viewer}
        />
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function PublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { athlete: viewer } = useAuth();

  const athleteId = params.athleteId as string;

  const [profile, setProfile] = useState<PublicAthlete | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, videos: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedStart, setFeedStart] = useState(0);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!athleteId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [profileRes, statsRes, videosRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/athletes/${athleteId}`),
          fetch(
            `${API_BASE_URL}/api/athletes/${athleteId}/stats?athlete_id=${viewer?.id ?? ""}`,
          ),
          fetch(`${API_BASE_URL}/api/videos/mine?athlete_id=${athleteId}`),
        ]);

        const [profileData, statsData, videosData] = await Promise.all([
          profileRes.json(),
          statsRes.json(),
          videosRes.json(),
        ]);

        if (profileRes.ok) setProfile(profileData.data);
        if (statsRes.ok) {
          setStats({
            followers: statsData.followers,
            following: statsData.following,
            videos: statsData.videos,
          });
          setIsFollowing(statsData.isFollowing);
        }
        if (videosRes.ok) {
          const videoList = videosData.data ?? [];
          // Fetch real Redis view counts for all videos in parallel
          const withRealViews = await Promise.all(
            videoList.map(async (v: VideoItem) => {
              try {
                const vRes = await fetch(
                  `${API_BASE_URL}/api/videos/${v.id}/views`,
                );
                const vData = await vRes.json();
                return {
                  ...v,
                  views:
                    vData.status === "success" ? vData.views : (v.views ?? 0),
                };
              } catch {
                return v;
              }
            }),
          );
          setVideos(withRealViews);
        }
      } catch {
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [athleteId, viewer?.id],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleFollow() {
    if (!viewer?.id || followLoading) return;
    setFollowLoading(true);
    const was = isFollowing;
    setIsFollowing(!was);
    setStats((s) => ({
      ...s,
      followers: was ? Math.max(0, s.followers - 1) : s.followers + 1,
    }));
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/athletes/${athleteId}/follow`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athlete_id: viewer.id }),
        },
      );
      const d = await res.json();
      if (res.ok) {
        setIsFollowing(d.following);
        setStats((s) => ({ ...s, followers: d.followers }));
      } else {
        setIsFollowing(was);
        setStats((s) => ({
          ...s,
          followers: was ? s.followers + 1 : Math.max(0, s.followers - 1),
        }));
      }
    } catch {
      setIsFollowing(was);
    } finally {
      setFollowLoading(false);
    }
  }

  function formatSport(s: string) {
    return s?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatHandle(name: string) {
    return "@" + name?.toLowerCase().replace(/\s+/g, "_");
  }

  function formatCount(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden={true} />
        <ActivityIndicator color="#EF4444" size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden={true} />
        <Text style={styles.loadingText}>Profile not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtnFull}
        >
          <Text style={styles.backBtnFullText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwnProfile = viewer?.id === athleteId;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar hidden={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAll(true)}
            tintColor="#EF4444"
            colors={["#EF4444"]}
          />
        }
      >
        {/* Header with back button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.handle}>{formatHandle(profile.name)}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {profile.photo_url ? (
              <Image
                source={{ uri: profile.photo_url }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {profile.status === "approved" && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={11} color="#fff" />
              </View>
            )}
          </View>
        </View>

        {/* Name + tags */}
        <View style={styles.nameSection}>
          <Text style={styles.athleteName}>{profile.name.toUpperCase()}</Text>
          <View style={styles.tagsRow}>
            <View style={styles.tagRed}>
              <Text style={styles.tagRedText}>
                {formatSport(profile.sport)}
              </Text>
            </View>
            {profile.city ? (
              <View style={styles.tagDark}>
                <Text style={styles.tagDarkText}>{profile.city}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Follow / Unfollow button — hidden on own profile */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            onPress={handleFollow}
            disabled={followLoading}
            activeOpacity={0.85}
          >
            {followLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : isFollowing ? (
              <View style={styles.followBtnInner}>
                <Ionicons name="checkmark-circle" size={16} color="#EF4444" />
                <Text style={[styles.followBtnText, { color: "#EF4444" }]}>Following</Text>
              </View>
            ) : (
              <View style={styles.followBtnInner}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.followBtnText}>Follow</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {formatCount(stats.followers)}
            </Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {formatCount(stats.following)}
            </Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(stats.videos)}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
        </View>

        {/* Bio / Achievements */}
        {profile.bio || profile.achievements ? (
          <>
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <Text style={styles.bio}>
              {profile.bio || profile.achievements}
            </Text>
          </>
        ) : null}

        {/* Videos grid */}
        <Text style={styles.sectionLabel}>VIDEOS</Text>
        {videos.length === 0 ? (
          <View style={styles.emptyVideos}>
            <Text style={styles.emptyVideosText}>No videos posted yet</Text>
          </View>
        ) : (
          <View style={styles.videoGrid}>
            {videos.map((video, index) => (
              <VideoThumb
                key={video.id}
                item={video}
                onPress={() => {
                  setFeedStart(index);
                  setFeedOpen(true);
                }}
              />
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Video feed modal */}
      <VideoFeedModal
        visible={feedOpen}
        videos={videos}
        startIndex={feedStart}
        onClose={() => setFeedOpen(false)}
        viewer={viewer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: { color: "#666", fontSize: 14 },
  backBtnFull: { marginTop: 8 },
  backBtnFullText: { color: "#EF4444", fontSize: 15, fontWeight: "700" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1C1C1C",
    borderWidth: 0.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { color: "#CCC", fontSize: 20, marginTop: -2 },
  handle: {
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

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
  nameSection: {
    alignItems: "center",
    marginBottom: 16,
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

  followBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  followBtnActive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D32F2F",
  },
  followBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

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

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    color: "#666",
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  bio: {
    marginHorizontal: 20,
    marginBottom: 20,
    fontSize: 13,
    color: "#999",
    lineHeight: 20,
  },

  videoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 8,
  },

  thumbCard: { width: THUMB },
  thumbBg: {
    width: THUMB,
    height: THUMB * 1.4,
    backgroundColor: "#1C1C1C",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: {
    width: THUMB,
    height: THUMB * 1.4,
    borderRadius: 8,
    resizeMode: "cover",
  },
  thumbPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbViewsBadge: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  thumbViewsRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  thumbViews: { color: "#fff", fontSize: 9, fontWeight: "700" },
  thumbCaption: {
    color: "#666",
    fontSize: 10,
    paddingHorizontal: 2,
    paddingTop: 3,
  },

  emptyVideos: {
    marginHorizontal: 20,
    padding: 24,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#222",
    borderRadius: 12,
    alignItems: "center",
  },
  emptyVideosText: { color: "#555", fontSize: 13 },
});
