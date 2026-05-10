import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const FILTERS = ["All", "Upcoming", "Registered", "Completed"];

const DUMMY_TRIALS = [
  {
    id: "1",
    title: "NATIONAL CRICKET TRIALS 2024",
    date: "Dec 15, 2024",
    time: "9:30 AM",
    venue: "Stadford Stadium, Lahore",
    spots: "45/100 spots left",
    status: "Open",
    almostFull: false,
    bg: "#0d1b0d",
  },
  {
    id: "2",
    title: "PROVINCIAL FOOTBALL CUP — PUNJAB",
    date: "Jan 08, 2025",
    time: "2:00 PM",
    venue: "Punjab Sports Complex, Lahore",
    spots: "89/100 spots left",
    status: "Open",
    almostFull: true,
    bg: "#0d0d1b",
  },
  {
    id: "3",
    title: "KARACHI BOXING CHAMPIONSHIP",
    date: "Jan 20, 2025",
    time: "10:00 AM",
    venue: "PSB Arena, Karachi",
    spots: "30/60 spots left",
    status: "Open",
    almostFull: false,
    bg: "#1b0d0d",
  },
  {
    id: "4",
    title: "NATIONAL SWIMMING TRIALS",
    date: "Feb 02, 2025",
    time: "8:00 AM",
    venue: "Aquatic Centre, Islamabad",
    spots: "Closed",
    status: "Completed",
    almostFull: false,
    bg: "#0d1a1b",
  },
];

export default function TrialsScreen() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = DUMMY_TRIALS.filter((t) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Completed") return t.status === "Completed";
    return t.status === "Open";
  });

  return (
    <View style={styles.root}>
      <StatusBar hidden={true} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header */}
        <Text style={styles.heading}>TRIALS & EVENTS</Text>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cards */}
        {filtered.map((trial) => (
          <View key={trial.id} style={[styles.card, { borderLeftColor: trial.status === "Open" ? "#22c55e" : "#666" }]}>
            {/* Top image placeholder */}
            <View style={[styles.cardImage, { backgroundColor: trial.bg }]}>
              <Text style={styles.cardImageIcon}>🏟</Text>
              {/* Badges */}
              <View style={styles.badgesRow}>
                <View style={[styles.badge, { backgroundColor: trial.status === "Open" ? "#22c55e" : "#555" }]}>
                  <Text style={styles.badgeText}>{trial.status}</Text>
                </View>
                {trial.almostFull && (
                  <View style={[styles.badge, { backgroundColor: "#F59E0B" }]}>
                    <Text style={styles.badgeText}>Almost Full</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Info */}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{trial.title}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📅</Text>
                <Text style={styles.infoText}>{trial.date}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🕐</Text>
                <Text style={styles.infoText}>{trial.time}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={styles.infoText}>{trial.venue}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👥</Text>
                <Text style={styles.infoText}>{trial.spots}</Text>
              </View>

              {trial.status === "Open" && (
                <TouchableOpacity style={styles.registerBtn} activeOpacity={0.85}>
                  <Text style={styles.registerBtnText}>Register  →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  content: { paddingBottom: 10 },

  heading: {
    fontSize: 24, fontWeight: "900", color: "#EF4444",
    letterSpacing: 1.5, marginHorizontal: 20, marginTop: 20, marginBottom: 14,
  },

  filterScroll: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterPill: {
    backgroundColor: "#1C1C1C", borderWidth: 0.5, borderColor: "#333",
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  filterPillActive: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  filterText: { color: "#888", fontSize: 13, fontWeight: "600" },
  filterTextActive: { color: "#fff" },

  card: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: "#141414",
    borderWidth: 0.5, borderColor: "#2A2A2A",
    borderLeftWidth: 3,
    borderRadius: 14, overflow: "hidden",
  },
  cardImage: {
    height: 160, alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  cardImageIcon: { fontSize: 60, opacity: 0.3 },
  badgesRow: {
    position: "absolute", top: 12, left: 12,
    flexDirection: "row", gap: 6,
  },
  badge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  cardBody: { padding: 16 },
  cardTitle: { color: "#F5F5F5", fontSize: 16, fontWeight: "800", marginBottom: 12, letterSpacing: 0.3 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  infoIcon: { fontSize: 13 },
  infoText: { color: "#999", fontSize: 13 },

  registerBtn: {
    marginTop: 12, backgroundColor: "#D32F2F",
    borderRadius: 10, paddingVertical: 11, paddingHorizontal: 20,
    alignSelf: "flex-start",
  },
  registerBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
