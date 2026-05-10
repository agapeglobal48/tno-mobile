import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SPORTS_GRID = [
  { name: "Cricket",    emoji: "🏏", bg: "#0d1b0d" },
  { name: "Football",   emoji: "⚽", bg: "#0d0d1b" },
  { name: "Javelin",    emoji: "🏃", bg: "#1b1b0d" },
  { name: "Boxing",     emoji: "🥊", bg: "#1b0d0d" },
  { name: "Athletics",  emoji: "🏅", bg: "#0d1a1b" },
  { name: "Swimming",   emoji: "🏊", bg: "#0d0d0d" },
  { name: "Hockey",     emoji: "🏒", bg: "#150d1b" },
  { name: "Badminton",  emoji: "🏸", bg: "#1b110d" },
];

const TRENDING_TAGS = ["#NextOlympian", "#PakistanSports", "#CricketPK", "#Boxing", "#Trials2024"];

export default function DiscoverScreen() {
  const [search, setSearch] = useState("");

  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header */}
        <Text style={styles.heading}>DISCOVER</Text>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search athletes, sports, tags..."
            placeholderTextColor="#444"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Trending tags */}
        <Text style={styles.sectionLabel}>🔥 TRENDING TAGS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
          {TRENDING_TAGS.map((t) => (
            <TouchableOpacity key={t} style={styles.tag} activeOpacity={0.7}>
              <Text style={styles.tagText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sports grid */}
        <Text style={styles.sectionLabel}>🏅 SPORTS</Text>
        <View style={styles.grid}>
          {SPORTS_GRID.map((s) => (
            <TouchableOpacity key={s.name} style={[styles.sportCard, { backgroundColor: s.bg }]} activeOpacity={0.85}>
              <Text style={styles.sportEmoji}>{s.emoji}</Text>
              <Text style={styles.sportName}>{s.name.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  content: { paddingBottom: 10 },

  heading: {
    fontSize: 28, fontWeight: "900", color: "#EF4444",
    letterSpacing: 2, marginHorizontal: 20, marginTop: 20, marginBottom: 16,
  },

  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#161616", borderWidth: 0.5, borderColor: "#2A2A2A",
    borderRadius: 12, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 14,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: "#F5F5F5", fontSize: 14, paddingVertical: 13 },

  sectionLabel: {
    fontSize: 12, fontWeight: "800", color: "#CCC", letterSpacing: 1.5,
    marginHorizontal: 20, marginBottom: 12,
  },

  tagsScroll: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  tag: {
    backgroundColor: "#1C1C1C", borderWidth: 0.5, borderColor: "#333",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  tagText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },

  grid: {
    flexDirection: "row", flexWrap: "wrap",
    marginHorizontal: 20, gap: 10,
  },
  sportCard: {
    width: "47.5%", aspectRatio: 1,
    borderRadius: 14, alignItems: "center", justifyContent: "flex-end",
    padding: 14, borderWidth: 0.5, borderColor: "#222",
  },
  sportEmoji: { fontSize: 40, marginBottom: 6 },
  sportName: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 1 },
});
