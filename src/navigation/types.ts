import { NavigatorScreenParams } from "@react-navigation/native";
import { Room } from "colyseus.js";

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Profile: undefined;
  AppSettings: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  About: undefined;
};

export type PlayStackParamList = {
  PlayHome: undefined;
  Lobby: { playerName: string };
  OnlineGame: { room: Room };
};

export type MainTabParamList = {
  Home: undefined;
  Play: NavigatorScreenParams<PlayStackParamList>;
  Stats: undefined;
  SettingsTab: undefined;
};
