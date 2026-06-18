import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";

import { Image, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

// ── Auth gate — redirects based on login state ────────────────
function AuthGate({ children }: { children: React.ReactNode }) {
  const { athlete, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === "(tabs)";
    const inAuthGroup = [
      "login",
      "register",
      "index",
      "forgot-password",
    ].includes(segments[0] as string);
    // Stack screens that are allowed while logged in (outside tabs)
    const inStackScreen = [
      "edit-profile",
      "public-profile",
      "forgot-password",
    ].includes(segments[0] as string);

    if (athlete && !inTabsGroup && !inStackScreen) {
      // Logged in but not in tabs or an allowed stack screen → go to home feed
      router.replace("/(tabs)");
    } else if (!athlete && !inAuthGroup) {
      // Not logged in and not on auth screens → go to login
      router.replace("/login");
    }
  }, [athlete, isLoading, segments]);

  // Show splash while loading persisted auth
  if (isLoading) {
    return (
      <View style={splash.container}>
        <Image
          source={require("../assets/splash.jpg")}
          style={splash.image}
          resizeMode="contain"
        />
      </View>
    );
  }

  return <>{children}</>;
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "80%", height: "80%" },
});

// ── Global error boundary — prevents app from crashing ───────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: false };
  }
  componentDidCatch(error: any) {
    console.log("[ErrorBoundary]", error);
  }
  render() {
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "fade",
                contentStyle: { backgroundColor: "#0A0A0A" },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="register" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="public-profile" />
              <Stack.Screen name="forgot-password" />
            </Stack>
          </AuthGate>
          <StatusBar hidden={true} />
        </View>
      </AuthProvider>
    </ErrorBoundary>
  );
}
