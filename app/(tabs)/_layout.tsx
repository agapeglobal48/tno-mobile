import { Tabs } from "expo-router";
import React from "react";
import {
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Icons (pure text/emoji — no icon lib needed) ─────────────
const TABS = [
  { key: "index", icon: "⌂", iconActive: "⌂", label: "Home" },
  { key: "discover", icon: "◎", iconActive: "◎", label: "Discover" },
  { key: "create", icon: "+", iconActive: "+", label: "Create" },
  { key: "trials", icon: "▦", iconActive: "▦", label: "Trials" },
  { key: "profile", icon: "◯", iconActive: "◯", label: "Profile" },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.barWrap, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {state.routes.map((route: any, i: number) => {
          const tab = TABS[i];
          const focused = state.index === i;
          const isCreate = tab.key === "create";

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented)
                  navigation.navigate(route.name);
              }}
            >
              {isCreate ? (
                // Centre create button — red circle
                <View style={styles.createBtn}>
                  <Text style={styles.createIcon}>+</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.icon, focused && styles.iconActive]}>
                    {tab.icon}
                  </Text>
                  <Text style={[styles.label, focused && styles.labelActive]}>
                    {tab.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <>
      <StatusBar hidden={true} />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="discover" />
        <Tabs.Screen name="create" />
        <Tabs.Screen name="trials" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    backgroundColor: "#0F0F0F",
    borderTopWidth: 0.5,
    borderTopColor: "#1E1E1E",
  },
  bar: {
    flexDirection: "row",
    height: 56,
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  icon: {
    fontSize: 20,
    color: "#444",
  },
  iconActive: {
    color: "#EF4444",
  },
  label: {
    fontSize: 10,
    color: "#444",
    fontWeight: "500",
  },
  labelActive: {
    color: "#EF4444",
  },
  // Create button
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  createIcon: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "300",
    marginTop: -2,
  },
});
