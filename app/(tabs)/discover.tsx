import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../src/config/api";
import { useAuth } from "../../src/context/AuthContext";

const { width, height } = Dimensions.get("window");
const THUMB = (width - 52) / 3;

// ── Types ─────────────────────────────────────────────────────
interface AthleteResult {
  id: string;
  name: string;
  sport: string;
  city: string;
  province: string;
  photo_url?: string;
  status: string;
  achievements?: string;
}

interface VideoResult {
  id: string;
  url: string;
  caption: string;
  sport: string;
  city: string;
  likes: number;
  views: number;
  comments: number;
  uploaded_at: string;
  athletes: { id: string; name: string; photo_url?: string; status: string };
}

const SPORTS_LIST = [
  { name: "Cricket", icon: "cricket", sport: "cricket" },
  { name: "Football", icon: "soccer", sport: "football" },
  { name: "Boxing", icon: "boxing-glove", sport: "boxing" },
  { name: "Athletics", icon: "run", sport: "athletics" },
  { name: "Hockey", icon: "hockey-sticks", sport: "hockey" },
  { name: "Swimming", icon: "swim", sport: "swimming" },
  { name: "Badminton", icon: "badminton", sport: "badminton" },
  { name: "Volleyball", icon: "volleyball", sport: "volleyball" },
  { name: "Wrestling", icon: "arm-flex", sport: "wrestling" },
  { name: "Weightlifting", icon: "weight-lifter", sport: "weightlifting" },
  { name: "Tennis", icon: "tennis", sport: "tennis" },
  { name: "Squash", icon: "table-tennis", sport: "squash" },
];

// ── Athlete card ──────────────────────────────────────────────
function AthleteCard({ item }: { item: AthleteResult }) {
  const router = useRouter();

  function formatSport(s: string) {
    return s?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <TouchableOpacity
      style={styles.athleteCard}
      onPress={() =>
        router.push({
          pathname: "/public-profile",
          params: { athleteId: item.id },
        })
      }
      activeOpacity={0.85}
    >
      {/* Avatar */}
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={styles.athleteAvatar} />
      ) : (
        <View style={styles.athleteAvatarPlaceholder}>
          <Text style={styles.athleteAvatarText}>
            {item.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {/* Info */}
      <View style={styles.athleteInfo}>
        <Text style={styles.athleteName}>{item.name}</Text>
        <View style={styles.athleteTags}>
          <View style={styles.tagRed}>
            <Text style={styles.tagRedText}>{formatSport(item.sport)}</Text>
          </View>
          {item.city ? (
            <View style={styles.tagDark}>
              <Text style={styles.tagDarkText}>{item.city}</Text>
            </View>
          ) : null}
        </View>
        {item.achievements ? (
          <Text style={styles.athleteBio} numberOfLines={1}>
            {item.achievements}
          </Text>
        ) : null}
      </View>
      {/* Verified */}
      {item.status === "approved" && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark" size={9} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Video thumbnail card ──────────────────────────────────────
function VideoThumbCard({ item }: { item: VideoResult }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(item.url, {
          time: 0,
        });
        if (!cancelled) setThumbnail(uri);
      } catch {
        // keep null — will show placeholder
      } finally {
        if (!cancelled) setThumbLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [item.url]);

  function fmt(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  return (
    <View style={styles.thumbCard}>
      {/* Thumbnail */}
      <View style={styles.thumbBg}>
        {thumbLoading ? (
          <ActivityIndicator color="#EF4444" size="small" />
        ) : thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbImg} />
        ) : (
          <Ionicons name="videocam-outline" size={24} color="rgba(255,255,255,0.3)" />
        )}
        {/* Play overlay */}
        <View style={styles.thumbPlayOverlay}>
          <View style={styles.thumbPlayCircle}>
            <Ionicons name="play" size={12} color="#fff" />
          </View>
        </View>
        {/* View count badge */}
        <View style={styles.thumbViewsBadge}>
          <Ionicons name="eye-outline" size={9} color="#fff" style={{ marginRight: 3 }} />
          <Text style={styles.thumbViews}>{fmt(item.views ?? 0)}</Text>
        </View>
      </View>
      {/* Caption below */}
      {item.caption ? (
        <Text style={styles.thumbCaption} numberOfLines={2}>
          {item.caption}
        </Text>
      ) : null}
      {/* Uploader */}
      <Text style={styles.thumbUser} numberOfLines={1}>
        @{item.athletes?.name?.toLowerCase().replace(/\s+/g, "_")}
      </Text>
    </View>
  );
}

// ── Comments sheet ────────────────────────────────────────────
function CommentsSheet({
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
        style={cmtSt.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Dimmed backdrop — absolute so it doesn't push the sheet */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={cmtSt.sheet}>
          <View style={cmtSt.header}>
            <Text style={cmtSt.headerTitle}>{total} Comments</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={cmtSt.center}>
              <ActivityIndicator color="#EF4444" />
            </View>
          ) : comments.length === 0 ? (
            <View style={cmtSt.center}>
              <Text style={cmtSt.emptyText}>No comments yet — be the first!</Text>
            </View>
          ) : (
            <ScrollView style={cmtSt.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {comments.map((c) => (
                <View key={c.id} style={cmtSt.row}>
                  <View style={cmtSt.avatar}>
                    <Text style={cmtSt.avatarText}>
                      {c.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={cmtSt.body}>
                    <View style={cmtSt.top}>
                      <Text style={cmtSt.name}>{c.name}</Text>
                      <Text style={cmtSt.time}>{timeAgo(c.created_at)}</Text>
                    </View>
                    <Text style={cmtSt.commentText}>{c.text}</Text>
                  </View>
                  {c.athlete_id === athlete?.id && (
                    <TouchableOpacity
                      onPress={() => deleteComment(c.id)}
                      style={cmtSt.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={14} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
          <View style={cmtSt.inputRow}>
            <View style={cmtSt.inputAvatar}>
              <Text style={cmtSt.inputAvatarText}>
                {athlete?.name?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
            <TextInput
              style={cmtSt.input}
              placeholder="Add a comment..."
              placeholderTextColor="#444"
              value={text}
              onChangeText={setText}
              maxLength={300}
              multiline
            />
            <TouchableOpacity
              style={[
                cmtSt.sendBtn,
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

const cmtSt = StyleSheet.create({
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

// ── Single full-screen video card for discover feed ───────────
function DiscoverVideoCard({
  video,
  isActive,
  athlete,
  onCommentPress,
}: {
  video: VideoResult;
  isActive: boolean;
  athlete: any;
  onCommentPress: (id: string) => void;
}) {
  const player = useVideoPlayer(video.url, (p) => {
    p.loop = true;
    p.muted = false;
  });

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(video.likes ?? 0);
  const [views, setViews] = useState(video.views ?? 0);
  const [comments, setComments] = useState(video.comments ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!athlete?.id) return;
    fetch(
      `${API_BASE_URL}/api/videos/${video.id}/like?athlete_id=${athlete.id}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") {
          setLiked(d.liked);
          setLikes(d.likes);
        }
      })
      .catch(() => {});
    fetch(`${API_BASE_URL}/api/videos/${video.id}/views`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setViews(d.views);
      })
      .catch(() => {});
  }, [video.id, athlete?.id]);

  useEffect(() => {
    if (isActive) {
      player.play();
      if (!viewTracked.current && athlete?.id) {
        viewTracked.current = true;
        fetch(`${API_BASE_URL}/api/videos/${video.id}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athlete_id: athlete.id }),
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
    if (!athlete?.id || likeLoading) return;
    setLikeLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((p) => (wasLiked ? Math.max(0, p - 1) : p + 1));
    try {
      const res = await fetch(`${API_BASE_URL}/api/videos/${video.id}/like`, {
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

  function formatHandle(name: string) {
    return "@" + name?.toLowerCase().replace(/\s+/g, "_");
  }

  function formatSport(s: string) {
    return s?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <View style={feedStyles.card}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Bottom gradient */}
      <View style={feedStyles.gradient} />

      {/* Right action bar */}
      <View style={feedStyles.actionBar}>
        {/* Avatar */}
        <View style={feedStyles.avatarWrap}>
          {video.athletes?.photo_url ? (
            <Image
              source={{ uri: video.athletes.photo_url }}
              style={feedStyles.avatarImg}
            />
          ) : (
            <View style={feedStyles.avatar}>
              <Text style={feedStyles.avatarText}>
                {video.athletes?.name?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
        </View>

        {/* Like */}
        <TouchableOpacity
          style={feedStyles.actionBtn}
          onPress={handleLike}
          disabled={likeLoading}
          activeOpacity={0.8}
        >
          <View
            style={[
              feedStyles.actionIconWrap,
              liked && feedStyles.actionIconWrapLiked,
            ]}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? "#EF4444" : "#fff"}
            />
          </View>
          <Text style={feedStyles.actionCount}>{fmt(likes)}</Text>
        </TouchableOpacity>

        {/* Comments */}
        <TouchableOpacity
          style={feedStyles.actionBtn}
          onPress={() => onCommentPress(video.id)}
          activeOpacity={0.8}
        >
          <View style={feedStyles.actionIconWrap}>
            <Image
              source={require("../../assets/icons/chat.png")}
              style={feedStyles.actionIconImg}
            />
          </View>
          <Text style={feedStyles.actionCount}>{fmt(comments)}</Text>
        </TouchableOpacity>

        {/* Views */}
        <View style={feedStyles.actionBtn}>
          <View style={feedStyles.actionIconWrap}>
            <Image
              source={require("../../assets/icons/eye.png")}
              style={feedStyles.actionIconImg}
            />
          </View>
          <Text style={feedStyles.actionCount}>{fmt(views)}</Text>
        </View>
      </View>

      {/* Bottom info */}
      <View style={feedStyles.info}>
        <View style={feedStyles.userRow}>
          <Text style={feedStyles.handle}>
            {formatHandle(video.athletes?.name ?? "athlete")}
          </Text>
          {video.athletes?.status === "approved" && (
            <View style={feedStyles.verifiedBadge}>
              <Ionicons name="checkmark" size={9} color="#fff" />
            </View>
          )}
        </View>
        {video.caption ? (
          <Text style={feedStyles.caption} numberOfLines={2}>
            {video.caption}
          </Text>
        ) : null}
        {video.sport ? (
          <View style={feedStyles.sportTag}>
            <Text style={feedStyles.sportTagText}>
              {formatSport(video.sport)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const feedStyles = StyleSheet.create({
  card: { width, height, backgroundColor: "#0A0A0A" },
  video: { ...StyleSheet.absoluteFillObject },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: "rgba(0,0,0,0.0)",
  },
  actionBar: {
    position: "absolute",
    right: 12,
    bottom: 100,
    alignItems: "center",
    gap: 20,
  },
  avatarWrap: { marginBottom: 4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D32F2F",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  actionBtn: { alignItems: "center", gap: 5 },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconWrapLiked: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderColor: "rgba(239,68,68,0.5)",
  },
  actionIconImg: { width: 22, height: 22, tintColor: "#fff" },
  actionCount: { fontSize: 11, color: "#fff", fontWeight: "700" },
  info: {
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
    gap: 6,
    marginBottom: 6,
  },
  handle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
  },
  caption: { color: "#fff", fontSize: 13, lineHeight: 18, marginBottom: 8 },
  sportTag: {
    alignSelf: "flex-start",
    backgroundColor: "#D32F2F",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sportTagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

// ── Discover feed modal ───────────────────────────────────────
function DiscoverFeedModal({
  visible,
  videos,
  startIndex,
  onClose,
  athlete,
}: {
  visible: boolean;
  videos: VideoResult[];
  startIndex: number;
  onClose: () => void;
  athlete: any;
}) {
  const { top: topInset } = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setActiveIndex(startIndex);
      setTimeout(() => {
        flatRef.current?.scrollToIndex({ index: startIndex, animated: false });
      }, 50);
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

        {/* Back arrow */}
        <TouchableOpacity
          style={{
            position: "absolute",
            top: topInset + 12,
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

        {/* Counter */}
        <View
          style={{
            position: "absolute",
            top: topInset + 16,
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
            <DiscoverVideoCard
              video={item}
              isActive={index === activeIndex}
              athlete={athlete}
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
        <CommentsSheet
          visible={!!commentVideoId}
          videoId={commentVideoId}
          onClose={() => setCommentVideoId(null)}
          athlete={athlete}
        />
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function DiscoverScreen() {
  const { athlete } = useAuth();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"athletes" | "videos">("athletes");
  const [athleteResults, setAthleteResults] = useState<AthleteResult[]>([]);
  const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feed modal state
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);

  // ── Search ────────────────────────────────────────────────────
  const doSearch = useCallback(
    async (q: string, currentTab: "athletes" | "videos") => {
      if (!q.trim()) {
        setAthleteResults([]);
        setVideoResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        if (currentTab === "athletes") {
          const res = await fetch(
            `${API_BASE_URL}/api/search/athletes?q=${encodeURIComponent(q)}`,
          );
          const data = await res.json();
          if (res.ok) setAthleteResults(data.data ?? []);
        } else {
          const res = await fetch(
            `${API_BASE_URL}/api/search/videos?q=${encodeURIComponent(q)}`,
          );
          const data = await res.json();
          if (res.ok) {
            const videoList = data.data ?? [];
            // Fetch real Redis view counts for all results in parallel
            const withRealViews = await Promise.all(
              videoList.map(async (v: VideoResult) => {
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
            setVideoResults(withRealViews);
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  function handleQueryChange(text: string) {
    setQuery(text);
    // Debounce — wait 400ms after typing stops
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(text, tab);
    }, 400);
  }

  function handleTabSwitch(newTab: "athletes" | "videos") {
    setTab(newTab);
    if (query.trim()) doSearch(query, newTab);
  }

  function clearSearch() {
    setQuery("");
    setAthleteResults([]);
    setVideoResults([]);
    setSearched(false);
  }

  const isSearching = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar hidden={true} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>DISCOVER</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={17} color="#555" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search athletes, sports, hashtags..."
          placeholderTextColor="#444"
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={clearSearch}
            activeOpacity={0.7}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={18} color="#444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Toggle tabs — only show when searching */}
      {isSearching && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              tab === "athletes" && styles.toggleBtnActive,
            ]}
            onPress={() => handleTabSwitch("athletes")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="people-outline"
              size={14}
              color={tab === "athletes" ? "#fff" : "#666"}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.toggleText,
                tab === "athletes" && styles.toggleTextActive,
              ]}
            >
              Athletes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              tab === "videos" && styles.toggleBtnActive,
            ]}
            onPress={() => handleTabSwitch("videos")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="videocam-outline"
              size={14}
              color={tab === "videos" ? "#fff" : "#666"}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.toggleText,
                tab === "videos" && styles.toggleTextActive,
              ]}
            >
              Videos
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results / default browse */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#EF4444" size="large" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : isSearching ? (
        // ── SEARCH RESULTS ───────────────────────────────────
        tab === "athletes" ? (
          athleteResults.length === 0 && searched ? (
            <View style={styles.centered}>
              <Ionicons name="search-outline" size={48} color="#333" />
              <Text style={styles.emptyTitle}>No athletes found</Text>
              <Text style={styles.emptyText}>
                Try a different name, sport or city
              </Text>
            </View>
          ) : (
            <FlatList
              key="athletes-list"
              data={athleteResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <AthleteCard item={item} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )
        ) : videoResults.length === 0 && searched ? (
          <View style={styles.centered}>
            <Ionicons name="videocam-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>No videos found</Text>
            <Text style={styles.emptyText}>
              Try searching with hashtags like #cricket
            </Text>
          </View>
        ) : (
          <FlatList
            key="videos-grid"
            data={videoResults}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setFeedStartIndex(index);
                  setFeedOpen(true);
                }}
              >
                <VideoThumbCard item={item} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )
      ) : (
        // ── DEFAULT BROWSE ────────────────────────────────────
        <FlatList
          data={SPORTS_LIST}
          keyExtractor={(item) => item.sport}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sportRow}
              activeOpacity={0.75}
              onPress={() => {
                setQuery(item.name);
                handleQueryChange(item.name);
                handleTabSwitch("athletes");
              }}
            >
              <View style={styles.sportIconWrap}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={22}
                  color="#EF4444"
                />
              </View>
              <Text style={styles.sportRowName}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color="#333" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.browseLabelRow}>
              <MaterialCommunityIcons name="trophy-outline" size={14} color="#EF4444" />
              <Text style={styles.browseLabel}>BROWSE BY SPORT</Text>
            </View>
          }
        />
      )}

      {/* Discover video feed modal */}
      <DiscoverFeedModal
        visible={feedOpen}
        videos={videoResults}
        startIndex={feedStartIndex}
        onClose={() => setFeedOpen(false)}
        athlete={athlete}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  heading: {
    fontSize: 28,
    fontWeight: "900",
    color: "#EF4444",
    letterSpacing: 2,
  },

  // Search bar
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#F5F5F5", fontSize: 14, paddingVertical: 13 },
  clearBtn: { padding: 6 },
  clearIcon: { color: "#555", fontSize: 14 },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 4,
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  toggleBtnActive: { backgroundColor: "#D32F2F" },
  toggleText: { color: "#666", fontSize: 13, fontWeight: "700" },
  toggleTextActive: { color: "#fff" },

  // Athlete card
  athleteCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 14,
    padding: 12,
  },
  athleteAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  athleteAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  athleteAvatarText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  athleteInfo: { flex: 1 },
  athleteName: {
    color: "#F5F5F5",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 5,
  },
  athleteTags: { flexDirection: "row", gap: 6, marginBottom: 4 },
  athleteBio: { color: "#666", fontSize: 12 },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  tagRed: {
    backgroundColor: "#D32F2F",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagRedText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  tagDark: {
    backgroundColor: "#1C1C1C",
    borderWidth: 0.5,
    borderColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagDarkText: { color: "#CCC", fontSize: 10 },

  // Video thumb
  thumbCard: { width: THUMB, marginBottom: 8 },
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
  thumbPlay: { color: "rgba(255,255,255,0.4)", fontSize: 22 },
  thumbPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    flexDirection: "row",
    alignItems: "center",
  },
  thumbViews: { color: "#fff", fontSize: 9, fontWeight: "700" },
  thumbCaption: {
    color: "#CCC",
    fontSize: 10,
    paddingHorizontal: 4,
    paddingTop: 4,
    lineHeight: 14,
  },
  thumbUser: {
    color: "#555",
    fontSize: 10,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },

  // Sports list
  sportRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: "#181818",
    gap: 14,
  },
  sportIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#1A0808",
    borderWidth: 0.5,
    borderColor: "#3A1515",
    alignItems: "center",
    justifyContent: "center",
  },
  sportRowName: {
    flex: 1,
    color: "#EFEFEF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  browseLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  browseLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 1.5,
  },

  // States
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#666", fontSize: 14 },
  emptyTitle: { color: "#F5F5F5", fontSize: 18, fontWeight: "800", marginTop: 8 },
  emptyText: { color: "#666", fontSize: 13, textAlign: "center" },

  listContent: { paddingBottom: 20 },
  gridContent: { paddingHorizontal: 20, paddingBottom: 20 },
  gridRow: { gap: 6, justifyContent: "space-between" },
});
