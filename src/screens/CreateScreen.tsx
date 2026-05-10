import {
    CameraView,
    useCameraPermissions,
    useMicrophonePermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

type Mode = "menu" | "record" | "preview" | "uploading" | "done";

// ── Pro tips ──────────────────────────────────────────────────
const PRO_TIPS = [
  "Film in portrait mode for best visibility",
  "Show your best skills in the first 3 seconds",
  "Use good lighting — natural light works great",
  "Add hashtags like #NextOlympian and your sport",
  "Keep videos between 15–60 seconds for best reach",
];

// ── Upload progress steps ─────────────────────────────────────
const UPLOAD_STEPS = [
  "Preparing video...",
  "Connecting to server...",
  "Uploading to cloud...",
  "Saving your post...",
  "Almost done...",
];

export default function CreateScreen() {
  const router = useRouter();
  const { athlete } = useAuth();

  const [mode, setMode] = useState<Mode>("menu");
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // ── Pick from gallery ───────────────────────────────────────
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

      // Check file size — reject if over 50MB
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        const sizeMB = (asset.fileSize / (1024 * 1024)).toFixed(1);
        Alert.alert(
          "Video Too Large",
          `Your video is ${sizeMB}MB. Maximum allowed size is 50MB.\n\nTip: Trim your video or reduce quality before uploading.`,
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

  // ── Start camera ────────────────────────────────────────────
  async function handleRecord() {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert(
          "Permission needed",
          "Camera access is required to record.",
        );
        return;
      }
    }
    if (!micPermission?.granted) {
      const res = await requestMicPermission();
      if (!res.granted) {
        Alert.alert(
          "Permission needed",
          "Microphone access is required to record.",
        );
        return;
      }
    }
    setMode("record");
  }

  // ── Toggle recording ────────────────────────────────────────
  async function toggleRecording() {
    if (!cameraRef.current) return;
    if (isRecording) {
      cameraRef.current.stopRecording();
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

  // ── Upload to backend ───────────────────────────────────────
  async function handlePost() {
    if (!videoUri) return;
    if (!athlete?.id) {
      Alert.alert("Not logged in", "Please log in before posting.");
      return;
    }

    setMode("uploading");
    setUploadStep(0);
    setUploadProgress(0);

    // Animate steps while uploading
    const stepInterval = setInterval(() => {
      setUploadStep((s) => {
        const next = s + 1;
        setUploadProgress((next / UPLOAD_STEPS.length) * 85); // goes to 85% then jumps to 100 on success
        if (next >= UPLOAD_STEPS.length - 1) clearInterval(stepInterval);
        return next;
      });
    }, 900);

    try {
      // Build multipart form
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
        // Don't set Content-Type — fetch sets it with boundary automatically for FormData
      });

      clearInterval(stepInterval);

      if (response.ok) {
        setUploadProgress(100);
        setMode("done");
        setVideoUri(null);
        setVideoSize(null);
        setCaption("");
      } else {
        const data = await response.json();
        setMode("preview");
        Alert.alert("Upload failed", data.message || "Please try again.");
      }
    } catch (err) {
      clearInterval(stepInterval);
      setMode("preview");
      Alert.alert(
        "Connection Error",
        "Make sure backend is running and connected.",
      );
    }
  }

  // ── DONE screen ─────────────────────────────────────────────
  if (mode === "done") {
    return (
      <View style={styles.root}>
        <StatusBar hidden={true} />
        <View style={styles.doneContainer}>
          <View style={styles.doneIcon}>
            <Text style={styles.doneCheck}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>Video Posted!</Text>
          <Text style={styles.doneSub}>
            Your video is live on The Next Olympian
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setMode("menu")}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>POST ANOTHER</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneSecondary}
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.7}
          >
            <Text style={styles.doneSecondaryText}>Go to Home Feed</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── UPLOADING screen ─────────────────────────────────────────
  if (mode === "uploading") {
    return (
      <View style={styles.root}>
        <StatusBar hidden={true} />
        <View style={styles.uploadingContainer}>
          <ActivityIndicator color="#EF4444" size="large" />
          <Text style={styles.uploadingStep}>{UPLOAD_STEPS[uploadStep]}</Text>
          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${uploadProgress}%` }]}
            />
          </View>
          <Text style={styles.progressPct}>{Math.round(uploadProgress)}%</Text>
        </View>
      </View>
    );
  }

  // ── RECORD screen ────────────────────────────────────────────
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
          {/* Top bar */}
          <View style={styles.cameraTopBar}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => {
                setMode("menu");
                setIsRecording(false);
              }}
            >
              <Text style={styles.cameraCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.cameraTimer}>
              {isRecording && <View style={styles.recDot} />}
              <Text style={styles.cameraTimerText}>
                {isRecording ? "REC" : "READY"}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* Record button */}
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

  // ── PREVIEW / CAPTION screen ─────────────────────────────────
  if (mode === "preview") {
    return (
      <View style={styles.root}>
        <StatusBar hidden={true} />
        <ScrollView
          contentContainerStyle={styles.previewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
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

          {/* Video preview placeholder */}
          <View style={styles.videoThumb}>
            <Text style={styles.videoThumbIcon}>🎬</Text>
            <Text style={styles.videoThumbText}>Video Selected</Text>
            <Text style={styles.videoThumbSub}>
              {videoUri?.split("/").pop()}
            </Text>
            {videoSize && (
              <View style={styles.sizeBadge}>
                <Text style={styles.sizeBadgeText}>{videoSize} / 50MB max</Text>
              </View>
            )}
          </View>

          {/* Caption */}
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

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardRow}>
              🏅 Sport:{" "}
              <Text style={styles.infoVal}>
                {athlete?.sport?.replace(/_/g, " ") || "—"}
              </Text>
            </Text>
            <Text style={styles.infoCardRow}>
              📍 City:{" "}
              <Text style={styles.infoVal}>{athlete?.city || "—"}</Text>
            </Text>
          </View>

          {/* Post button */}
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

  // ── MENU screen (default) ────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />
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
          <View style={styles.recordCircle}>
            <Text style={styles.recordCircleIcon}>⏺</Text>
          </View>
          <Text style={styles.cardLabel}>RECORD</Text>
          <Text style={styles.cardSub}>Record directly with your camera</Text>
        </TouchableOpacity>

        {/* Upload */}
        <TouchableOpacity
          style={styles.uploadCard}
          onPress={handleUpload}
          activeOpacity={0.85}
        >
          <View style={styles.uploadCircle}>
            <Text style={styles.uploadCircleIcon}>⬆</Text>
          </View>
          <Text style={styles.cardLabel}>UPLOAD</Text>
          <Text style={styles.cardSub}>Choose a video from your gallery</Text>
        </TouchableOpacity>

        {/* Pro tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>✨ PRO TIPS</Text>
          {PRO_TIPS.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
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
    marginTop: 20,
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
  recordCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#B8860B",
    alignItems: "center",
    justifyContent: "center",
  },
  recordCircleIcon: { fontSize: 28, color: "#fff" },
  uploadCircleIcon: { fontSize: 28, color: "#fff" },
  cardLabel: {
    color: "#F5F5F5",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2,
  },
  cardSub: { color: "#666", fontSize: 13 },

  tipsCard: {
    marginHorizontal: 20,
    backgroundColor: "#111",
    borderWidth: 0.5,
    borderColor: "#222",
    borderRadius: 16,
    padding: 18,
  },
  tipsTitle: {
    color: "#CCC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 14,
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
  cameraCloseText: { color: "#fff", fontSize: 16 },
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
  videoThumb: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#1C1C1C",
    borderRadius: 14,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 0.5,
    borderColor: "#333",
  },
  videoThumbIcon: { fontSize: 48 },
  videoThumbText: { color: "#F5F5F5", fontSize: 15, fontWeight: "700" },
  videoThumbSub: { color: "#666", fontSize: 12 },
  sizeBadge: {
    backgroundColor: "#1C1C1C",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: "#333",
  },
  sizeBadgeText: { color: "#888", fontSize: 12, fontWeight: "600" },

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
  infoCardRow: { color: "#666", fontSize: 13 },
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

  // Done
  doneContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(211,47,47,0.15)",
    borderWidth: 2,
    borderColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  doneCheck: { fontSize: 32, color: "#EF4444" },
  doneTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#F5F5F5",
    marginBottom: 8,
  },
  doneSub: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  doneBtn: {
    width: "100%",
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
  },
  doneSecondary: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  doneSecondaryText: { color: "#666", fontSize: 14, fontWeight: "600" },
});
