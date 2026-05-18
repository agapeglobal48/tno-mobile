import { Tabs } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Nav icons ─────────────────────────────────────────────────
const NAV_ICONS = {
  home: require("../../assets/icons/nav-home.png"),
  discover: require("../../assets/icons/nav-discover.png"),
  trials: require("../../assets/icons/nav-trials.png"),
  profile: require("../../assets/icons/nav-profile.png"),
};

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { key: "index", icon: NAV_ICONS.home, isCreate: false },
    { key: "discover", icon: NAV_ICONS.discover, isCreate: false },
    { key: "create", icon: null, isCreate: true },
    { key: "trials", icon: NAV_ICONS.trials, isCreate: false },
    { key: "profile", icon: NAV_ICONS.profile, isCreate: false },
  ];

  return (
    <View
      style={[
        styles.barWrap,
        {
          paddingBottom: Math.max(
            insets.bottom,
            Platform.OS === "android" ? 8 : 4,
          ),
        },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.map((route: any, i: number) => {
          const tab = tabs[i];
          const focused = state.index === i;

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
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            >
              {tab.isCreate ? (
                <View style={styles.createBtn}>
                  <Text style={styles.createIcon}>+</Text>
                </View>
              ) : (
                <Image
                  source={tab.icon}
                  style={[
                    styles.navIcon,
                    { tintColor: focused ? "#EF4444" : "#FFFFFF" },
                  ]}
                />
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
    height: 52,
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navIcon: {
    width: 26,
    height: 26,
    resizeMode: "contain",
  },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
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
