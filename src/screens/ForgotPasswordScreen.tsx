import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config/api";

type Step = "email" | "code" | "success";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Step 1 — send reset code
  async function handleSendCode() {
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Check your email for a 6-digit reset code.");
        setStep("code");
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch {
      setError("Cannot reach server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — verify code + set new password
  async function handleResetPassword() {
    setError("");
    if (!code.trim() || code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("success");
      } else {
        setError(data.message || "Invalid or expired code.");
      }
    } catch {
      setError("Cannot reach server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logo}
            />
          </View>

          <Text style={styles.title}>
            {step === "success" ? "Password Reset!" : "Forgot Password"}
          </Text>
          <Text style={styles.subtitle}>
            {step === "email" &&
              "Enter your registered email and we'll send you a reset code."}
            {step === "code" &&
              `Code sent to ${email}. Enter it below along with your new password.`}
            {step === "success" &&
              "Your password has been updated. You can now log in."}
          </Text>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          {/* Message */}
          {message && !error ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>✓ {message}</Text>
            </View>
          ) : null}

          {/* Step 1 — Email */}
          {step === "email" && (
            <>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#444"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>SEND RESET CODE</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Step 2 — Code + New Password */}
          {step === "code" && (
            <>
              <Text style={styles.label}>6-DIGIT CODE</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor="#444"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={styles.label}>NEW PASSWORD</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#444"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? "HIDE" : "SHOW"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor="#444"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>RESET PASSWORD</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setError("");
                  handleSendCode();
                }}
                style={styles.resendBtn}
              >
                <Text style={styles.resendText}>
                  Did not get the code? Resend
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3 — Success */}
          {step === "success" && (
            <>
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>🎉</Text>
              </View>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => router.replace("/login")}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>GO TO LOGIN</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
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
  logo: { width: 36, height: 36, resizeMode: "contain" },

  title: { fontSize: 28, fontWeight: "900", color: "#F5F5F5", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 28 },

  errorBox: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 0.5,
    borderColor: "#EF4444",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { color: "#EF4444", fontSize: 13 },
  messageBox: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 0.5,
    borderColor: "#22c55e",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  messageText: { color: "#22c55e", fontSize: 13 },

  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#666",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    color: "#F5F5F5",
    fontSize: 15,
    padding: 14,
    marginBottom: 18,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 8,
    textAlign: "center",
  },

  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    marginBottom: 18,
  },
  passwordInput: { flex: 1, color: "#F5F5F5", fontSize: 15, padding: 14 },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { color: "#888", fontSize: 11, fontWeight: "700" },

  btn: {
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 1 },

  resendBtn: { marginTop: 16, alignItems: "center" },
  resendText: { color: "#666", fontSize: 13, textDecorationLine: "underline" },

  successIcon: { alignItems: "center", paddingVertical: 32 },
  successEmoji: { fontSize: 64 },
});
