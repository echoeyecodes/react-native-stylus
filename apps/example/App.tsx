import { Fraunces_500Medium, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stylus } from "react-native-stylus";
import { OrderProvider } from "./src/order/order-context";
import { MenuScreen } from "./src/screens/MenuScreen";

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <Stylus>
      <SafeAreaProvider>
        <OrderProvider>
          <StatusBar style="dark" />
          <MenuScreen />
        </OrderProvider>
      </SafeAreaProvider>
    </Stylus>
  );
}
