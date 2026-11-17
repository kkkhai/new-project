# Building the iOS and Android apps

The game is a web app. [Capacitor](https://capacitorjs.com/) wraps the same build (`dist/`) as native iOS and Android apps, so there is one codebase for all three platforms.

The app id is set in `capacitor.config.json` (`vn.fproduction.diamondrush`, a placeholder). **Change it before the first store upload**: it can't be changed after publishing.

## One-time setup

| Platform | You need |
| --- | --- |
| Android | [Android Studio](https://developer.android.com/studio) (includes the SDK and an emulator) |
| iOS | A Mac with [Xcode](https://developer.apple.com/xcode/), plus an Apple Developer account (US$99/year) to publish |

```bash
npm install
npm install @capacitor/android @capacitor/ios   # native platform packages
npm run build
npx cap add android     # creates the android/ project (commit it)
npx cap add ios         # creates the ios/ project (Mac only, commit it)
```

## Every time you change the game

```bash
npm run cap:android   # build, copy into the Android project, open Android Studio
npm run cap:ios       # build, copy into the Xcode project, open Xcode
```

Press Run in Android Studio or Xcode to try it on a device or emulator.

## Phone checklist
- Landscape orientation: set it in Android Studio (`AndroidManifest.xml`, `android:screenOrientation="sensorLandscape"`) and Xcode (Deployment Info).
- Touch controls (D-pad, TOOL, Undo on Easy, pause) appear automatically on touch screens.
- Save data uses the web view's local storage, which persists between app launches.
- App icons and splash screens: replace the defaults once the owner's art is ready (`npx @capacitor/assets generate`).
