import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Field from "../components/Field";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

const SPORTS = [
  "cricket",
  "football",
  "tennis",
  "table_tennis",
  "swimming",
  "athletics",
  "hockey",
  "volleyball",
  "badminton",
  "boxing",
  "wrestling",
  "weightlifting",
  "cycling",
  "squash",
  "other",
];

interface FormState {
  name: string;
  phone: string;
  sport: string;
  city: string;
  bio: string;
  achievements: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { athlete: contextAthlete, updateAthlete } = useAuth();

  // Use context athlete, fall back to params
  const athlete =
    contextAthlete ??
    (params.athlete ? JSON.parse(params.athlete as string) : null);

  const [form, setForm] = useState<FormState>({
    name: athlete?.name ?? "",
    phone: athlete?.phone ?? "",
    sport: athlete?.sport ?? "",
    city: athlete?.city ?? "",
    bio: athlete?.bio ?? "",
    achievements: athlete?.achievements ?? "",
  });
  const [photo, setPhoto] = useState<any>(null);
  const [sportOpen, setSportOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  function setField(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  }

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "Full name is required";
    if (!form.phone.trim() || form.phone.trim().length < 10)
      e.phone = "Valid phone number is required";
    if (!form.sport) e.sport = "Please select a sport";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      // Step 1: upload new photo to R2 if user picked one
      let newPhotoUrl = athlete?.photo_url ?? null;
      if (photo) {
        const photoForm = new FormData();
        const filename = photo.uri.split("/").pop() || "photo.jpg";
        const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
        const mimeMap: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
        };
        photoForm.append("photo", {
          uri: photo.uri,
          name: filename,
          type: mimeMap[ext] ?? "image/jpeg",
        } as any);
        photoForm.append("athlete_id", athlete.id);

        const photoRes = await fetch(`${API_BASE_URL}/api/upload/photo`, {
          method: "POST",
          body: photoForm,
        });
        const photoData = await photoRes.json();
        if (photoRes.ok) newPhotoUrl = photoData.photo_url;
        else {
          Alert.alert(
            "Photo Upload Failed",
            photoData.message ||
              "Could not upload photo. Other changes will still be saved.",
          );
        }
      }

      // Step 2: update profile text fields
      const body = new URLSearchParams();
      body.append("id", athlete.id);
      body.append("name", form.name.trim());
      body.append("phone", form.phone.trim());
      body.append("sport", form.sport);
      body.append("city", form.city.trim());
      body.append("bio", form.bio.trim());
      body.append("achievements", form.achievements.trim());
      if (newPhotoUrl) body.append("photo_url", newPhotoUrl);

      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const data = await response.json();

      if (response.ok) {
        updateAthlete({
          ...data.data,
          ...(newPhotoUrl ? { photo_url: newPhotoUrl } : {}),
        });
        router.replace({ pathname: "/(tabs)/profile" });
      } else {
        Alert.alert("Error", data.message || "Could not save changes.");
      }
    } catch (err) {
      Alert.alert("Connection Error", "Unable to connect. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  function formatSportLabel(s: string) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar hidden={true} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo picker */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.8}
              style={styles.avatarWrap}
            >
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.avatarImg} />
              ) : athlete?.photo_url ? (
                <Image
                  source={{ uri: athlete.photo_url }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {form.name.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera-outline" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Tap to change photo</Text>
          </View>

          {/* Form fields */}
          <Text style={styles.sectionLabel}>PERSONAL INFO</Text>

          <Field label="Full Name" error={errors.name}>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Your full name"
              placeholderTextColor="#444"
              value={form.name}
              onChangeText={(v) => setField("name", v)}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Phone Number" error={errors.phone}>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="Your phone number"
              placeholderTextColor="#444"
              value={form.phone}
              onChangeText={(v) => setField("phone", v)}
              keyboardType="phone-pad"
            />
          </Field>

          <Field label="City">
            <TextInput
              style={styles.input}
              placeholder="e.g. Lahore, Karachi, Islamabad"
              placeholderTextColor="#444"
              value={form.city}
              onChangeText={(v) => setField("city", v)}
              autoCapitalize="words"
            />
          </Field>

          <Text style={styles.sectionLabel}>SPORTS PROFILE</Text>

          <Field label="Sport" error={errors.sport}>
            <TouchableOpacity
              style={[
                styles.input,
                styles.selectBtn,
                errors.sport && styles.inputError,
              ]}
              onPress={() => setSportOpen(!sportOpen)}
              activeOpacity={0.8}
            >
              <Text
                style={
                  form.sport ? styles.selectText : styles.selectPlaceholder
                }
              >
                {form.sport
                  ? formatSportLabel(form.sport)
                  : "Select your sport"}
              </Text>
              <Text style={styles.selectArrow}>{sportOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {sportOpen && (
              <View style={styles.dropdown}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  {SPORTS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.dropdownItem,
                        form.sport === s && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setField("sport", s);
                        setSportOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          form.sport === s && styles.dropdownTextActive,
                        ]}
                      >
                        {formatSportLabel(s)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Field>

          <Field label="Bio">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Tell your story — what drives you as an athlete?"
              placeholderTextColor="#444"
              value={form.bio}
              onChangeText={(v) => setField("bio", v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          <Field label="Previous Achievements">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Titles, medals, tournaments..."
              placeholderTextColor="#444"
              value={form.achievements}
              onChangeText={(v) => setField("achievements", v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>

          {/* Read-only fields */}
          <Text style={styles.sectionLabel}>ACCOUNT INFO</Text>

          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>EMAIL</Text>
            <Text style={styles.readOnlyValue}>{athlete?.email}</Text>
            <Text style={styles.readOnlyNote}>Email cannot be changed</Text>
          </View>

          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>CNIC</Text>
            <Text style={styles.readOnlyValue}>{athlete?.cnic}</Text>
            <Text style={styles.readOnlyNote}>CNIC cannot be changed</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2A2A2A",
    backgroundColor: "#0A0A0A",
  },
  backBtn: { padding: 6 },
  backIcon: { color: "#CCC", fontSize: 22 },
  headerTitle: { color: "#F5F5F5", fontSize: 16, fontWeight: "700" },
  saveBtn: {
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  photoSection: { alignItems: "center", paddingVertical: 24 },
  avatarWrap: { position: "relative", marginBottom: 8 },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#D32F2F",
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1C1C1C",
    borderWidth: 1.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#555", fontSize: 34, fontWeight: "900" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0A0A0A",
  },
  photoHint: { color: "#555", fontSize: 12 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    color: "#666",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    color: "#F5F5F5",
    fontSize: 15,
    padding: 13,
  },
  inputError: { borderColor: "#EF4444" },
  textarea: { minHeight: 90, textAlignVertical: "top" },

  selectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: { color: "#F5F5F5", fontSize: 15 },
  selectPlaceholder: { color: "#444", fontSize: 15 },
  selectArrow: { color: "#888", fontSize: 11 },
  dropdown: {
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2A2A2A",
  },
  dropdownItemActive: { backgroundColor: "rgba(211,47,47,0.15)" },
  dropdownText: { color: "#CCC", fontSize: 15 },
  dropdownTextActive: { color: "#EF4444", fontWeight: "600" },

  readOnlyField: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#222",
    borderRadius: 10,
    padding: 13,
  },
  readOnlyLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#555",
    letterSpacing: 1,
    marginBottom: 4,
  },
  readOnlyValue: { fontSize: 15, color: "#555" },
  readOnlyNote: { fontSize: 11, color: "#3A3A3A", marginTop: 4 },
});
