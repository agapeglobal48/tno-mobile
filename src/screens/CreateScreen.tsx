import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");
const THUMB_SIZE = (width - 52) / 3;

type Mode = "menu" | "record" | "preview" | "uploading";

const UPLOAD_STEPS = [
  "Preparing video...",
  "Connecting to server...",
  "Uploading to cloud...",
  "Checking content...",
  "Saving your post...",
];

const PRO_TIPS = [
  "Film in portrait mode for best visibility",
  "Show your best skills in the first 3 seconds",
  "Use good lighting — natural light works great",
  "Add hashtags like #NextOlympian and your sport",
  "Keep videos between 15–60 seconds for best reach",
];

interface VideoItem {
  id: string;
  url: string;
  caption: string;
  sport: string;
  likes: number;
  uploaded_at: string;
  thumbnail?: string;
}

// ── Single video card inside personal feed ────────────────────
function PersonalVideoCard({
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
  const [views, setViews] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

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
    if (isActive) player.play();
    else player.pause();
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

      {/* Bottom gradient overlay */}
      <View style={feedStyles.bottomGradient} />

      {/* Right action bar — same as home feed */}
      <View style={feedStyles.actionBar}>
        {/* Avatar */}
        <View style={feedStyles.avatarWrap}>
          {athlete?.photo_url ? (
            <Image
              source={{ uri: athlete.photo_url }}
              style={feedStyles.avatarImg}
            />
          ) : (
            <View style={feedStyles.avatar}>
              <Text style={feedStyles.avatarText}>
                {athlete?.name?.charAt(0).toUpperCase() ?? "?"}
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

      {/* Bottom info — same layout as home feed */}
      <View style={feedStyles.info}>
        {/* User handle + verified */}
        <View style={feedStyles.userRow}>
          <Text style={feedStyles.handle}>
            {formatHandle(athlete?.name ?? "athlete")}
          </Text>
          {athlete?.status === "approved" && (
            <View style={feedStyles.verifiedBadge}>
              <Ionicons name="checkmark" size={9} color="#fff" />
            </View>
          )}
        </View>

        {/* Caption */}
        {video.caption ? (
          <Text style={feedStyles.caption} numberOfLines={2}>
            {video.caption}
          </Text>
        ) : null}

        {/* Tags row */}
        <View style={feedStyles.tagsRow}>
          {video.sport ? (
            <View style={feedStyles.tagRed}>
              <Text style={feedStyles.tagRedText}>
                {formatSport(video.sport)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const feedStyles = StyleSheet.create({
  card: { width, height, backgroundColor: "#0A0A0A" },
  video: { ...StyleSheet.absoluteFillObject },

  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    // Simulated gradient using layered views
    backgroundColor: "rgba(0,0,0,0.0)",
  },

  // Right action bar
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
    overflow: "hidden",
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

  // Bottom info
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
  tagsRow: { flexDirection: "row", gap: 6 },
  tagRed: {
    backgroundColor: "#D32F2F",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagRedText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

// ── Personal feed modal ───────────────────────────────────────
function PersonalFeedModal({
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
  const { top: topInset } = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(startIndex);
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

        {/* Back arrow top left */}
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

        {/* MY VIDEOS label + counter top center */}
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
              color: "#fff",
              fontSize: 13,
              fontWeight: "700",
              letterSpacing: 0.5,
            }}
          >
            MY VIDEOS
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              marginTop: 2,
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
            <PersonalVideoCard
              video={item}
              isActive={index === activeIndex}
              athlete={athlete}
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
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function CreateScreen() {
  const { athlete } = useAuth();

  const [mode, setMode] = useState<Mode>("menu");
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);

  // Preview player — must be declared at top level (hooks rules)
  // videoUri updates dynamically as user picks/records
  const previewPlayer = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop = false;
    p.muted = true;
  });

  // Keep previewPlayer in sync when videoUri changes
  useEffect(() => {
    if (videoUri) previewPlayer.replace(videoUri);
  }, [videoUri]);

  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // ── Fetch thumbnails for each video ───────────────────────────
  async function generateThumbnail(url: string): Promise<string | undefined> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(url, { time: 0 });
      return uri;
    } catch {
      return undefined;
    }
  }

  // ── Fetch own videos ──────────────────────────────────────────
  const fetchMyVideos = useCallback(async () => {
    if (!athlete?.id) return;
    setLoadingVideos(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/videos/mine?athlete_id=${athlete.id}`,
      );
      const data = await res.json();
      if (res.ok && data.data) {
        // Generate thumbnails in parallel
        const videosWithThumbs = await Promise.all(
          data.data.map(async (v: VideoItem) => ({
            ...v,
            thumbnail: await generateThumbnail(v.url),
          })),
        );
        setMyVideos(videosWithThumbs);
      }
    } catch {
    } finally {
      setLoadingVideos(false);
    }
  }, [athlete?.id]);

  useEffect(() => {
    fetchMyVideos();
  }, [fetchMyVideos]);

  function showToast() {
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  }

  // ── Pick from gallery ─────────────────────────────────────────
  async function handleUpload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your media library.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 120,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        const sizeMB = (asset.fileSize / (1024 * 1024)).toFixed(1);
        Alert.alert(
          "Video Too Large",
          `Your video is ${sizeMB}MB. Maximum is 50MB.\n\nTip: Trim or compress before uploading.`,
        );
        return;
      }
      setVideoUri(asset.uri);
      setVideoSize(
        asset.fileSize
          ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)}MB`
          : null,
      );
      setMode("preview");
    }
  }

  // ── Start camera ──────────────────────────────────────────────
  async function handleRecord() {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert("Permission needed", "Camera access is required.");
        return;
      }
    }
    if (!micPermission?.granted) {
      const res = await requestMicPermission();
      if (!res.granted) {
        Alert.alert("Permission needed", "Microphone access is required.");
        return;
      }
    }
    setMode("record");
  }

  // ── Toggle recording ──────────────────────────────────────────
  async function toggleRecording() {
    if (!cameraRef.current) return;
    if (isRecording) {
      // stopRecording() resolves the recordAsync() promise below
      await cameraRef.current.stopRecording();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      try {
        const video = await cameraRef.current.recordAsync({ maxDuration: 120 });
        if (video?.uri) {
          setVideoUri(video.uri);
          setMode("preview");
        }
      } catch {
        setIsRecording(false);
      }
    }
  }

  // ── Upload to backend ─────────────────────────────────────────
  async function handlePost() {
    if (!videoUri) return;
    if (!athlete?.id) {
      Alert.alert("Not logged in", "Please log in before posting.");
      return;
    }

    setMode("uploading");
    setUploadStep(0);
    setUploadProgress(0);

    const stepInterval = setInterval(() => {
      setUploadStep((s) => {
        const next = s + 1;
        setUploadProgress((next / UPLOAD_STEPS.length) * 85);
        if (next >= UPLOAD_STEPS.length - 1) clearInterval(stepInterval);
        return next;
      });
    }, 900);

    try {
      const formData = new FormData();
      const filename = videoUri.split("/").pop() || "video.mp4";
      const ext = filename.split(".").pop()?.toLowerCase() || "mp4";
      const mimeMap: Record<string, string> = {
        mp4: "video/mp4",
        mov: "video/quicktime",
        avi: "video/x-msvideo",
        webm: "video/webm",
      };
      formData.append("video", {
        uri: videoUri,
        name: filename,
        type: mimeMap[ext] ?? "video/mp4",
      } as any);
      formData.append("athlete_id", athlete.id);
      formData.append("caption", caption.trim());
      formData.append("sport", athlete.sport ?? "");
      formData.append("province", athlete.province ?? "");
      formData.append("city", athlete.city ?? "");

      const response = await fetch(`${API_BASE_URL}/api/videos/upload`, {
        method: "POST",
        body: formData,
      });
      clearInterval(stepInterval);

      if (response.ok) {
        setUploadProgress(100);
        setVideoUri(null);
        setVideoSize(null);
        setCaption("");
        setMode("menu");
        fetchMyVideos();
        showToast();
      } else {
        const data = await response.json();
        setMode("preview");
        if (data.code === "CONTENT_REJECTED") {
          Alert.alert(
            "Inappropriate Content",
            "Your video was rejected. Only sports content is allowed.",
            [{ text: "Understood" }],
          );
        } else if (data.code === "NOT_SPORTS_CONTENT") {
          Alert.alert(
            "Sports Content Only",
            data.message || "Please upload sports content only.",
            [{ text: "OK" }],
          );
        } else {
          Alert.alert("Upload Failed", data.message || "Please try again.");
        }
      }
    } catch {
      clearInterval(stepInterval);
      setMode("preview");
      Alert.alert("Connection Error", "Unable to connect. Please check your internet and try again.");
    }
  }

  // ── UPLOADING screen ──────────────────────────────────────────
  if (mode === "uploading") {
    return (
      <View style={styles.root}>
        <StatusBar hidden={true} />
        <View style={styles.uploadingContainer}>
          <ActivityIndicator color="#EF4444" size="large" />
          <Text style={styles.uploadingStep}>{UPLOAD_STEPS[uploadStep]}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${uploadProgress}%` as any },
              ]}
            />
          </View>
          <Text style={styles.progressPct}>{Math.round(uploadProgress)}%</Text>
        </View>
      </View>
    );
  }

  // ── RECORD screen ─────────────────────────────────────────────
  if (mode === "record") {
    return (
      <View style={styles.root}>
        <StatusBar hidden={true} />
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          mode="video"
        >
          <View style={styles.cameraTopBar}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => {
                setMode("menu");
                setIsRecording(false);
              }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.cameraTimer}>
              {isRecording && <View style={styles.recDot} />}
              <Text style={styles.cameraTimerText}>
                {isRecording ? "REC" : "READY"}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.cameraBottomBar}>
            <TouchableOpacity
              style={styles.recordBtnOuter}
              onPress={toggleRecording}
              activeOpacity={0.9}
            >
              <View
                style={[
                  styles.recordBtnInner,
                  isRecording && styles.recordBtnInnerActive,
                ]}
              />
            </TouchableOpacity>
            <Text style={styles.cameraHint}>
              {isRecording ? "Tap to stop" : "Tap to record · Max 2 min"}
            </Text>
          </View>
        </CameraView>
      </View>
    );
  }

  // ── PREVIEW / CAPTION screen ──────────────────────────────────
  if (mode === "preview") {
    return (
      <View style={styles.root}>
        <StatusBar hidden={true} />
        <ScrollView
          contentContainerStyle={styles.previewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.previewHeader}>
            <TouchableOpacity
              onPress={() => setMode("menu")}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtn}>←</Text>
            </TouchableOpacity>
            <Text style={styles.previewTitle}>New Post</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Live video preview */}
          <View style={styles.videoPreviewWrap}>
            <VideoView
              player={previewPlayer}
              style={styles.videoPreview}
              contentFit="cover"
              nativeControls={true}
            />
            {videoSize && (
              <View style={styles.sizeBadge}>
                <Text style={styles.sizeBadgeText}>{videoSize} / 50MB max</Text>
              </View>
            )}
          </View>

          <View style={styles.captionSection}>
            <Text style={styles.captionLabel}>CAPTION</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Describe your video, add hashtags..."
              placeholderTextColor="#444"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={styles.captionCount}>{caption.length}/300</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardRow}>
              <MaterialCommunityIcons name="trophy-outline" size={14} color="#666" />
              <Text style={styles.infoCardText}>
                Sport:{" "}
                <Text style={styles.infoVal}>
                  {athlete?.sport?.replace(/_/g, " ") || "—"}
                </Text>
              </Text>
            </View>
            <View style={styles.infoCardRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.infoCardText}>
                City:{" "}
                <Text style={styles.infoVal}>{athlete?.city || "—"}</Text>
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.postBtn}
            onPress={handlePost}
            activeOpacity={0.85}
          >
            <Text style={styles.postBtnText}>POST VIDEO</Text>
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    );
  }

  // ── MENU screen ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar hidden={true} />

      {/* Success toast */}
      {successToast && (
        <View style={styles.toast}>
          <View style={styles.toastRow}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={styles.toastText}>Video posted successfully!</Text>
          </View>
        </View>
      )}

      {/* Personal feed modal */}
      <PersonalFeedModal
        visible={feedOpen}
        videos={myVideos}
        startIndex={feedStartIndex}
        onClose={() => setFeedOpen(false)}
        athlete={athlete}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.heading}>CREATE</Text>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            SHOW YOUR <Text style={styles.red}>SKILLS</Text>
          </Text>
          <Text style={styles.heroSub}>
            Record or upload your best training moments
          </Text>
        </View>

        {/* Record */}
        <TouchableOpacity
          style={styles.recordCard}
          onPress={handleRecord}
          activeOpacity={0.85}
        >
          <Image
            source={require("../../assets/icons/create-record.png")}
            style={styles.createActionIcon}
          />
          <Text style={styles.cardLabel}>RECORD</Text>
          <Text style={styles.cardSub}>Record directly with your camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadCard}
          onPress={handleUpload}
          activeOpacity={0.85}
        >
          <Image
            source={require("../../assets/icons/create-upload.png")}
            style={styles.createActionIcon}
          />
          <Text style={styles.cardLabel}>UPLOAD</Text>
          <Text style={styles.cardSub}>Choose a video from your gallery</Text>
        </TouchableOpacity>

        {/* ── MY VIDEOS ── */}
        <View style={styles.galleryHeader}>
          <Text style={styles.galleryTitle}>MY VIDEOS</Text>
          <Text style={styles.galleryCount}>{myVideos.length} posted</Text>
        </View>

        {loadingVideos ? (
          <View style={styles.galleryLoading}>
            <ActivityIndicator color="#EF4444" size="small" />
            <Text style={styles.galleryLoadingText}>
              Loading your videos...
            </Text>
          </View>
        ) : myVideos.length === 0 ? (
          <View style={styles.galleryEmpty}>
            <Ionicons name="videocam-outline" size={40} color="#333" />
            <Text style={styles.galleryEmptyText}>
              No videos yet — post your first one!
            </Text>
          </View>
        ) : (
          <View style={styles.galleryGrid}>
            {myVideos.map((video) => (
              <View key={video.id} style={styles.thumbCard}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    setFeedStartIndex(myVideos.indexOf(video));
                    setFeedOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  {/* Real thumbnail from first frame */}
                  {video.thumbnail ? (
                    <Image
                      source={{ uri: video.thumbnail }}
                      style={styles.thumbImg}
                    />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="videocam-outline" size={28} color="#333" />
                    </View>
                  )}
                  {/* Play overlay */}
                  <View style={styles.thumbOverlay}>
                    <View style={styles.thumbPlayBtn}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Delete button */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert(
                      "Delete Video",
                      "Are you sure you want to delete this video? This cannot be undone.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              const res = await fetch(
                                `${API_BASE_URL}/api/videos/${video.id}`,
                                {
                                  method: "DELETE",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    athlete_id: athlete?.id,
                                  }),
                                },
                              );
                              if (res.ok) {
                                setMyVideos((prev) =>
                                  prev.filter((v) => v.id !== video.id),
                                );
                              } else {
                                Alert.alert("Error", "Could not delete video.");
                              }
                            } catch {
                              Alert.alert("Error", "Connection failed.");
                            }
                          },
                        },
                      ],
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={14} color="#fff" />
                </TouchableOpacity>

                {/* Caption */}
                {video.caption ? (
                  <View style={styles.thumbCaptionBar}>
                    <Text style={styles.thumbCaption} numberOfLines={1}>
                      {video.caption}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Pro tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsTitleRow}>
            <Ionicons name="bulb-outline" size={16} color="#EF4444" />
            <Text style={styles.tipsTitle}>PRO TIPS</Text>
          </View>
          {PRO_TIPS.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  content: { paddingBottom: 10 },
  red: { color: "#EF4444" },

  heading: {
    fontSize: 28,
    fontWeight: "900",
    color: "#EF4444",
    letterSpacing: 2,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  hero: { alignItems: "center", marginBottom: 28, paddingHorizontal: 20 },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#F5F5F5",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSub: { fontSize: 14, color: "#666", textAlign: "center" },

  recordCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: "#1a0505",
    borderWidth: 0.5,
    borderColor: "#3a0a0a",
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
  },
  uploadCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "#1a1200",
    borderWidth: 0.5,
    borderColor: "#3a2a00",
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
  },
  createActionIcon: { width: 56, height: 56, resizeMode: "contain" },
  cardLabel: {
    color: "#F5F5F5",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2,
  },
  cardSub: { color: "#666", fontSize: 13 },

  // Gallery
  galleryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  galleryTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#CCC",
    letterSpacing: 2,
  },
  galleryCount: { fontSize: 12, color: "#555" },
  galleryLoading: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  galleryLoadingText: { color: "#555", fontSize: 13 },
  galleryEmpty: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#222",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  galleryEmptyText: { color: "#555", fontSize: 13, textAlign: "center" },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 24,
  },
  thumbCard: {
    width: THUMB_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#141414",
  },
  deleteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  thumbImg: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.4,
    resizeMode: "cover",
  },
  thumbPlaceholder: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.4,
    backgroundColor: "#1C1C1C",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbCaptionBar: {
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  thumbCaption: { fontSize: 10, color: "#666" },

  // Toast
  toast: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    zIndex: 100,
    backgroundColor: "#0d2a0d",
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  toastRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toastText: { color: "#22c55e", fontSize: 14, fontWeight: "700" },

  // Tips
  tipsCard: {
    marginHorizontal: 20,
    backgroundColor: "#111",
    borderWidth: 0.5,
    borderColor: "#222",
    borderRadius: 16,
    padding: 18,
  },
  tipsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  tipsTitle: {
    color: "#CCC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#EF4444",
    marginTop: 6,
  },
  tipText: { flex: 1, color: "#888", fontSize: 13, lineHeight: 18 },

  // Camera
  camera: { flex: 1 },
  cameraTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 20,
  },
  cameraCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  cameraTimerText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cameraBottomBar: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 12,
  },
  recordBtnOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  recordBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EF4444",
  },
  recordBtnInnerActive: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  cameraHint: { color: "rgba(255,255,255,0.7)", fontSize: 13 },

  // Preview
  previewContent: { paddingBottom: 20 },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  backBtn: { color: "#CCC", fontSize: 24 },
  previewTitle: { color: "#F5F5F5", fontSize: 16, fontWeight: "700" },
  videoPreviewWrap: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    overflow: "hidden",
    height: 260,
    backgroundColor: "#1C1C1C",
  },
  videoPreview: { width: "100%", height: 260 },
  sizeBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sizeBadgeText: { color: "#CCC", fontSize: 11, fontWeight: "600" },
  captionSection: { marginHorizontal: 20, marginBottom: 16 },
  captionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: "#666",
    marginBottom: 8,
  },
  captionInput: {
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    color: "#F5F5F5",
    fontSize: 15,
    padding: 13,
    minHeight: 100,
    textAlignVertical: "top",
  },
  captionCount: {
    color: "#444",
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  infoCardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoCardText: { color: "#666", fontSize: 13 },
  infoVal: { color: "#CCC", fontWeight: "600" },
  postBtn: {
    marginHorizontal: 20,
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  postBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
  },

  // Uploading
  uploadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 40,
  },
  uploadingStep: { color: "#CCC", fontSize: 15, textAlign: "center" },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#1C1C1C",
    borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: "#EF4444", borderRadius: 2 },
  progressPct: { color: "#666", fontSize: 13 },
});
