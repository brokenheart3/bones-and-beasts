import { NavigatorScreenParams } from "@react-navigation/native";
import { Room } from "colyseus.js";

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Profile: undefined;
  Avatar: undefined;
  AppSettings: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  About: undefined;
};

export type PlayStackParamList = {
  PlayHome: undefined;
  Lobby: { playerName: string };
  OnlineGame: { room: Room };
  Paywall: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Play: NavigatorScreenParams<PlayStackParamList>;
  Stats: undefined;
  SettingsTab: undefined;
};
