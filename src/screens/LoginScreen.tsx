import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import Field from "../components/Field";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { setAthlete } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [serverError, setServerError] = useState("");
  const [unverified, setUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  function validate(): boolean {
    const e: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "Valid email is required";
    if (!password || password.length < 6)
      e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    setServerError("");
    setUnverified(false);
    setResendSuccess(false);

    try {
      const body = new URLSearchParams();
      body.append("email", email.trim());
      body.append("password", password);

      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const data = await response.json();

      if (response.ok) {
        setAthlete(data.data);
        router.replace("/(tabs)");
      } else if (data.code === "EMAIL_NOT_VERIFIED") {
        setUnverified(true);
      } else {
        setServerError(data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      setServerError(
        "Cannot reach server. Make sure backend is running and IP is correct in src/config/api.ts",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) setResendSuccess(true);
    } catch {
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar hidden={true} />

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
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
          <View style={styles.hero}>
            <Text style={styles.heroSub}>PAKISTAN SPORTS INITIATIVE</Text>
            <Text style={styles.heroTitle}>
              Welcome <Text style={styles.red}>Back</Text>
            </Text>
            <Text style={styles.heroDesc}>
              Sign in using your registered email and password.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>
              Use the email and password you registered with
            </Text>

            {serverError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠ {serverError}</Text>
              </View>
            ) : null}

            {/* Email not verified banner */}
            {unverified ? (
              <View style={styles.verifyBanner}>
                <Text style={styles.verifyTitle}>📧 Email Not Verified</Text>
                <Text style={styles.verifyText}>
                  Please check your inbox and tap the verification link before
                  logging in.
                </Text>
                {resendSuccess ? (
                  <Text style={styles.verifySuccess}>
                    ✓ Verification email resent!
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResendVerification}
                    disabled={resendLoading}
                    activeOpacity={0.7}
                  >
                    {resendLoading ? (
                      <ActivityIndicator
                        color="#EF4444"
                        size="small"
                        style={{ marginTop: 8 }}
                      />
                    ) : (
                      <Text style={styles.resendLink}>
                        Resend verification email
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            <View style={styles.fieldGap}>
              <Field label="Email" error={errors.email}>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Enter your registered email"
                  placeholderTextColor="#444"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setErrors((p) => ({ ...p, email: undefined }));
                    setServerError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </Field>

              <Field label="Password" error={errors.password}>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      errors.password && styles.inputError,
                    ]}
                    placeholder="Enter your password"
                    placeholderTextColor="#444"
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      setErrors((p) => ({ ...p, password: undefined }));
                      setServerError("");
                    }}
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
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>LOGIN</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => router.push("/register")}
              activeOpacity={0.8}
            >
              <Text style={styles.registerBtnText}>CREATE AN ACCOUNT</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            Do not have an account?{" "}
            <Text style={styles.red} onPress={() => router.push("/register")}>
              Register here
            </Text>
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/forgot-password")}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  red: { color: "#EF4444" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
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
  heroDesc: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },

  card: {
    marginHorizontal: 20,
    backgroundColor: "#141414",
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    borderRadius: 20,
    padding: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F5F5F5",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
  },

  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#EF4444",
    fontSize: 13,
    lineHeight: 18,
  },
  verifyBanner: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  verifyTitle: { color: "#F59E0B", fontSize: 14, fontWeight: "800" },
  verifyText: { color: "#CCC", fontSize: 12, lineHeight: 18 },
  verifySuccess: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  resendLink: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
    marginTop: 4,
  },

  fieldGap: { gap: 4 },

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
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 50 },
  eyeBtn: { position: "absolute", right: 13, padding: 4 },
  eyeIcon: { fontSize: 11, color: "#888", fontWeight: "700" },

  loginBtn: {
    backgroundColor: "#D32F2F",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: "#2A2A2A" },
  dividerText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
    letterSpacing: 1,
  },

  registerBtn: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  registerBtnText: {
    color: "#CCC",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  footerNote: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    marginTop: 20,
  },
  forgotBtn: { marginTop: 14, alignItems: "center" },
  forgotText: { color: "#666", fontSize: 13, textDecorationLine: "underline" },
});
