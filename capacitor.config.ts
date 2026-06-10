import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.naildesk.studio",
  appName: "NailDesk",
  webDir: "dist",

  server: {
    androidScheme: "https",
    hostname: "naildesk.app",
    allowNavigation: ["naildesk-api-prod.up.railway.app", "*.up.railway.app"],
    cleartext: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#fff5f9",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#fff5f9",
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_naildesk",
      iconColor: "#D4537E",
      sound: "default",
    },
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    loggingBehavior: "none",
    initialFocus: true,
  },

  ios: {
    scheme: "NailDesk",
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: "mobile",
  },
};

export default config;
