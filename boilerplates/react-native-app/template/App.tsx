import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { greeting } from "./src/greeting";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>react-native-app</Text>
      <Text style={styles.subtitle}>{greeting()}</Text>
      <Text style={styles.hint}>
        Scaffolded by boilerplates-with-ai-skills. Edit App.tsx to get started.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    maxWidth: 320,
  },
});
