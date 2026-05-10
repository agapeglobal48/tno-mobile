import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export default function Field({ label, error, children }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginHorizontal: 20, marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#AAAAAA",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  error: { fontSize: 11, color: "#EF4444", marginTop: 4 },
});
