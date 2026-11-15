import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stylus } from "react-native-stylus";
import { MenuScreen } from "./src/screens/MenuScreen";

export default function App() {
  return (
    <Stylus>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <MenuScreen />
      </SafeAreaProvider>
    </Stylus>
  );
}
