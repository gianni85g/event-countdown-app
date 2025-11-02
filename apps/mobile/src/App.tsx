import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "./screens/HomeScreen";
import { AddEventScreen } from "./screens/AddEventScreen";
import { EventDetailsScreen } from "./screens/EventDetailsScreen";

export type RootStackParamList = {
  Home: undefined;
  Add: undefined;
  Details: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Moments" }} />
        <Stack.Screen name="Add" component={AddEventScreen} options={{ title: "Add Event" }} />
        <Stack.Screen name="Details" component={EventDetailsScreen} options={{ title: "Event" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

