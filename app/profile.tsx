import { Redirect } from "expo-router";
// Profile is now inside (tabs) group
export default function ProfileRedirect() {
  return <Redirect href="/(tabs)/profile" />;
}
