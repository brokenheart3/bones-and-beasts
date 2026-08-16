import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PlayStackParamList } from "./types";
import PlayScreen from "../screens/PlayScreen";
import LobbyScreen from "../screens/LobbyScreen";
import GameScreenOnline from "../screens/GameScreenOnline";
import PaywallScreen from "../screens/PaywallScreen";

const Stack = createNativeStackNavigator<PlayStackParamList>();

export default function PlayStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlayHome" component={PlayScreen} />
      <Stack.Screen name="Lobby" component={LobbyScreen} />
      <Stack.Screen name="OnlineGame" component={GameScreenOnline} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  );
}
