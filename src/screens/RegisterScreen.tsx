import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
import Field from "../components/Field";
import { API_BASE_URL } from "../config/api";

// ── Data ──────────────────────────────────────────────────────
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

const PROVINCES = ["Punjab", "Sindh", "KPK", "Balochistan", "Federal"];

const CITIES_BY_PROVINCE: Record<string, string[]> = {
  Punjab: [
    "Lahore",
    "Faisalabad",
    "Rawalpindi",
    "Gujranwala",
    "Multan",
    "Sialkot",
    "Bahawalpur",
    "Sargodha",
    "Sheikhupura",
    "Jhang",
    "Rahim Yar Khan",
    "Gujrat",
    "Kasur",
    "Sahiwal",
    "Okara",
    "Wah Cantonment",
    "Dera Ghazi Khan",
    "Mirpur Khas",
    "Chiniot",
    "Kamoke",
  ],
  Sindh: [
    "Karachi",
    "Hyderabad",
    "Sukkur",
    "Larkana",
    "Nawabshah",
    "Mirpurkhas",
    "Khairpur",
    "Jacobabad",
    "Shikarpur",
    "Dadu",
    "Thatta",
    "Badin",
    "Sanghar",
    "Tando Allahyar",
    "Kotri",
  ],
  KPK: [
    "Peshawar",
    "Mardan",
    "Mingora",
    "Kohat",
    "Abbottabad",
    "Mansehra",
    "Swabi",
    "Dera Ismail Khan",
    "Charsadda",
    "Nowshera",
    "Haripur",
    "Bannu",
    "Swat",
    "Buner",
    "Malakand",
  ],
  Balochistan: [
    "Quetta",
    "Turbat",
    "Khuzdar",
    "Hub",
    "Chaman",
    "Gwadar",
    "Dera Murad Jamali",
    "Sibi",
    "Zhob",
    "Loralai",
    "Nushki",
    "Kharan",
    "Panjgur",
    "Mastung",
    "Kalat",
  ],
  Federal: ["Islamabad"],
};

// ── Types ─────────────────────────────────────────────────────
interface FormState {
  name: string;
  email: string;
  phone: string;
  cnic: string;
  sport: string;
  province: string;
  city: string;
  achievements: string;
  password: string;
  confirmPassword: string;
}

// ── Component ─────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    cnic: "",
    sport: "",
    province: "",
    city: "",
    achievements: "",
    password: "",
    confirmPassword: "",
  });
  const [photo, setPhoto] = useState<any>(null);
  const [sportOpen, setSportOpen] = useState(false);
  const [provOpen, setProvOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<FormState & { general: string }>
  >({});
  const [success, setSuccess] = useState(false);

  function setField(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined, general: undefined }));
  }

  function formatCNIC(text: string) {
    const digits = text.replace(/\D/g, "");
    let f = digits;
    if (digits.length > 5) f = digits.slice(0, 5) + "-" + digits.slice(5);
    if (digits.length > 12) f = f.slice(0, 13) + "-" + digits.slice(12);
    setField("cnic", f.slice(0, 15));
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo access to upload your photo.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  }

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "Full name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Valid email is required";
    if (!form.phone.trim() || form.phone.trim().length < 10)
      e.phone = "Valid phone number is required";
    if (!/^\d{5}-\d{7}-\d$/.test(form.cnic)) e.cnic = "Format: 12345-1234567-1";
    if (!form.sport) e.sport = "Please select a sport";
    if (!form.province) e.province = "Please select a province";
    if (!form.city) e.city = "Please select a city";
    if (!form.password || form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const body = new FormData();
      body.append("name", form.name.trim());
      body.append("email", form.email.trim());
      body.append("phone", form.phone.trim());
      body.append("cnic", form.cnic.trim());
      body.append("sport", form.sport);
      body.append("province", form.province);
      body.append("city", form.city);
      body.append("achievements", form.achievements.trim());
      body.append("password", form.password);

      // Attach photo if selected
      if (photo) {
        const filename = photo.uri.split("/").pop() || "photo.jpg";
        const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
        const mimeMap: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
        };
        body.append("photo", {
          uri: photo.uri,
          name: filename,
          type: mimeMap[ext] ?? "image/jpeg",
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        body,
        // Don't set Content-Type — fetch sets it with boundary automatically
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setForm({
          name: "",
          email: "",
          phone: "",
          cnic: "",
          sport: "",
          province: "",
          city: "",
          achievements: "",
          password: "",
          confirmPassword: "",
        });
        setPhoto(null);
      } else {
        if (data.errors) setErrors(data.errors);
        else setErrors({ general: data.message || "Registration failed." });
      }
    } catch {
      Alert.alert(
        "Connection Error",
        "Cannot reach server.\n\n1. Backend is running (node server.js)\n2. Phone and PC on same WiFi\n3. IP in src/config/api.ts matches your PC",
      );
    } finally {
      setLoading(false);
    }
  }

  function label(val: string) {
    return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ── SUCCESS ────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.root}>
        <StatusBar hidden={true} />
        <View style={styles.successContainer}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Registration Complete!</Text>
            <Text style={styles.successMsg}>
              We have sent a verification link to your email address. Please
              check your inbox and tap the link to verify your account before
              logging in.
            </Text>
            <View style={[styles.successDivider, { marginVertical: 16 }]} />
            {/* Email check reminder */}
            <View
              style={{
                backgroundColor: "rgba(245,158,11,0.1)",
                borderWidth: 0.5,
                borderColor: "rgba(245,158,11,0.4)",
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
                width: "100%",
              }}
            >
              <Text
                style={{
                  color: "#F59E0B",
                  fontSize: 13,
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                📧 Check Your Email
              </Text>
              <Text style={{ color: "#CCC", fontSize: 12, lineHeight: 18 }}>
                Open the verification link we sent you, then come back to log
                in.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.loginNowBtn}
              onPress={() => router.push("/login")}
              activeOpacity={0.85}
            >
              <Text style={styles.loginNowText}>GO TO LOGIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerAnotherBtn}
              onPress={() => setSuccess(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.registerAnotherText}>
                Register Another Athlete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── FORM ───────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.headerLogoImg}
          />
          <Text style={styles.headerTitle}>
            The Next <Text style={styles.red}>Olympian</Text>
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroSub}>PAKISTAN SPORTS INITIATIVE</Text>
            <Text style={styles.heroTitle}>
              Become <Text style={styles.red}>The Next</Text>
              {"\n"}Olympian
            </Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Register Now!</Text>
            </View>
            <Text style={styles.heroDesc}>
              Are you passionate about sports? Do you dream of representing
              Pakistan on the global stage? Join the most powerful grassroots
              sports movement in the country.
            </Text>
          </View>

          {/* Feature Cards */}
          <View style={styles.featGrid}>
            {[
              { icon: "👥", label: "Nationwide Trials" },
              { icon: "🏅", label: "10+ Sports Categories" },
              { icon: "🎯", label: "Coaching by Olympians" },
              { icon: "🛡️", label: "Scholarships" },
            ].map((f, i) => (
              <View key={i} style={styles.featCard}>
                <Text style={styles.featIcon}>{f.icon}</Text>
                <Text style={styles.featLabel}>{f.label}</Text>
              </View>
            ))}
          </View>

          {/* General error banner */}
          {errors.general ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠ {errors.general}</Text>
            </View>
          ) : null}

          {/* ── PERSONAL INFO ── */}
          <Text style={styles.sectionLabel}>PERSONAL INFO</Text>

          <Field label="Name" error={errors.name}>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter your full name"
              placeholderTextColor="#444"
              value={form.name}
              onChangeText={(v) => setField("name", v)}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Enter your email"
              placeholderTextColor="#444"
              value={form.email}
              onChangeText={(v) => setField("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Field>

          <Field label="Phone No" error={errors.phone}>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="Enter your phone number"
              placeholderTextColor="#444"
              value={form.phone}
              onChangeText={(v) => setField("phone", v)}
              keyboardType="phone-pad"
            />
          </Field>

          <Field label="CNIC" error={errors.cnic}>
            <TextInput
              style={[styles.input, errors.cnic && styles.inputError]}
              placeholder="12345-1234567-1"
              placeholderTextColor="#444"
              value={form.cnic}
              onChangeText={formatCNIC}
              keyboardType="numeric"
              maxLength={15}
            />
          </Field>

          {/* ── ACCOUNT SECURITY ── */}
          <Text style={styles.sectionLabel}>ACCOUNT SECURITY</Text>

          <Field label="Password" error={errors.password}>
            <View style={styles.passwordRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  errors.password && styles.inputError,
                ]}
                placeholder="Min 6 characters"
                placeholderTextColor="#444"
                value={form.password}
                onChangeText={(v) => setField("password", v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((p) => !p)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? "HIDE" : "SHOW"}
                </Text>
              </TouchableOpacity>
            </View>
          </Field>

          <Field label="Confirm Password" error={errors.confirmPassword}>
            <View style={styles.passwordRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  errors.confirmPassword && styles.inputError,
                ]}
                placeholder="Re-enter your password"
                placeholderTextColor="#444"
                value={form.confirmPassword}
                onChangeText={(v) => setField("confirmPassword", v)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPassword((p) => !p)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIcon}>
                  {showConfirmPassword ? "HIDE" : "SHOW"}
                </Text>
              </TouchableOpacity>
            </View>
          </Field>

          {/* ── LOCATION ── */}
          <Text style={styles.sectionLabel}>LOCATION</Text>

          {/* Province dropdown */}
          <Field label="Province" error={errors.province}>
            <TouchableOpacity
              style={[
                styles.input,
                styles.selectBtn,
                errors.province && styles.inputError,
              ]}
              onPress={() => {
                setProvOpen(!provOpen);
                setCityOpen(false);
                setSportOpen(false);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={
                  form.province ? styles.selectText : styles.selectPlaceholder
                }
              >
                {form.province || "Select your province"}
              </Text>
              <Text style={styles.selectArrow}>{provOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {provOpen && (
              <View style={styles.dropdown}>
                {PROVINCES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.dropdownItem,
                      form.province === p && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setField("province", p);
                      setField("city", ""); // reset city when province changes
                      setProvOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        form.province === p && styles.dropdownTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Field>

          {/* City dropdown — only show once province is selected */}
          <Field label="City" error={errors.city}>
            <TouchableOpacity
              style={[
                styles.input,
                styles.selectBtn,
                errors.city && styles.inputError,
                !form.province && styles.inputDisabled,
              ]}
              onPress={() => {
                if (!form.province) return;
                setCityOpen(!cityOpen);
                setProvOpen(false);
                setSportOpen(false);
              }}
              activeOpacity={form.province ? 0.8 : 1}
            >
              <Text
                style={form.city ? styles.selectText : styles.selectPlaceholder}
              >
                {!form.province
                  ? "Select province first"
                  : form.city || "Select your city"}
              </Text>
              <Text style={styles.selectArrow}>{cityOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {cityOpen && form.province && (
              <View style={styles.dropdown}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                  {(CITIES_BY_PROVINCE[form.province] ?? []).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.dropdownItem,
                        form.city === c && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setField("city", c);
                        setCityOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          form.city === c && styles.dropdownTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Field>

          {/* ── SPORTS PROFILE ── */}
          <Text style={styles.sectionLabel}>SPORTS PROFILE</Text>

          <Field label="Sport" error={errors.sport}>
            <TouchableOpacity
              style={[
                styles.input,
                styles.selectBtn,
                errors.sport && styles.inputError,
              ]}
              onPress={() => {
                setSportOpen(!sportOpen);
                setProvOpen(false);
                setCityOpen(false);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={
                  form.sport ? styles.selectText : styles.selectPlaceholder
                }
              >
                {form.sport ? label(form.sport) : "Select your sport"}
              </Text>
              <Text style={styles.selectArrow}>{sportOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {sportOpen && (
              <View style={styles.dropdown}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
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
                        {label(s)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Field>

          {/* Photo Upload */}
          <Field label="Passport Size Photo">
            <TouchableOpacity
              style={styles.photoUpload}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              {photo ? (
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.photoPreview}
                />
              ) : (
                <>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoText}>Tap to upload photo</Text>
                  <Text style={styles.photoSub}>
                    JPG or PNG · Passport size
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Field>

          {/* Previous Achievements */}
          <Text style={styles.sectionLabel}>ACHIEVEMENTS</Text>
          <Field label="Previous Achievements">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe your sports achievements, titles, medals, competitions..."
              placeholderTextColor="#444"
              value={form.achievements}
              onChangeText={(v) => setField("achievements", v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>REGISTER NOW</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push("/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{" "}
              <Text style={styles.loginLinkHighlight}>Login</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  red: { color: "#EF4444" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2A2A2A",
    backgroundColor: "#0A0A0A",
  },
  headerLogoImg: { width: 36, height: 36, resizeMode: "contain" },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F5F5F5",
    letterSpacing: 0.5,
  },

  hero: { padding: 24, alignItems: "center" },
  heroSub: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 3,
    color: "#EF4444",
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#F5F5F5",
    textAlign: "center",
    lineHeight: 40,
    marginBottom: 10,
  },
  heroBadge: {
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.5)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
  },
  heroBadgeText: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  heroDesc: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },

  featGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 10 },
  featCard: {
    width: "47%",
    backgroundColor: "#181818",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  featIcon: { fontSize: 24 },
  featLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#CCC",
    textAlign: "center",
  },

  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    borderRadius: 10,
    padding: 12,
  },
  errorBannerText: { color: "#EF4444", fontSize: 13 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    color: "#666",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },

  field: { marginHorizontal: 20, marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#AAAAAA",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
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
  inputDisabled: { opacity: 0.4 },
  errorText: { fontSize: 11, color: "#EF4444", marginTop: 4 },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 50 },
  eyeBtn: { position: "absolute", right: 13, padding: 4 },
  eyeIcon: { fontSize: 11, color: "#888", fontWeight: "700" },

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

  photoUpload: {
    backgroundColor: "#1C1C1C",
    borderWidth: 1.5,
    borderColor: "#333",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  photoIcon: { fontSize: 32 },
  photoText: { fontSize: 14, fontWeight: "600", color: "#CCC" },
  photoSub: { fontSize: 12, color: "#666" },
  photoPreview: {
    width: 90,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D32F2F",
  },

  submitBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
  },

  loginLink: { marginTop: 16, alignItems: "center" },
  loginLinkText: { fontSize: 14, color: "#666" },
  loginLinkHighlight: { color: "#EF4444", fontWeight: "700" },

  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successCard: {
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(211,47,47,0.15)",
    borderWidth: 2,
    borderColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successCheck: { fontSize: 28, color: "#EF4444" },
  successTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#F5F5F5",
    marginBottom: 8,
  },
  successMsg: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  successDivider: {
    width: "100%",
    height: 0.5,
    backgroundColor: "#2A2A2A",
    marginBottom: 24,
  },
  loginNowBtn: {
    width: "100%",
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  loginNowText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
  },
  registerAnotherBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  registerAnotherText: { color: "#666", fontSize: 14, fontWeight: "600" },
});
