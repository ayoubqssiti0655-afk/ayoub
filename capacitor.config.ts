import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ma.masar.courier",
  appName: "Masar Courier",
  webDir: "public",
  server: {
    // URL du serveur (IP locale pour les tests sur le même Wi-Fi ou URL de production)
    url: "http://192.168.11.104:3000/courier",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;

