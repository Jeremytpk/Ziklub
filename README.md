# Ziklub

**Same song, same moment.** Friends join a private room from their phones and listen to the same music at the same second. The DJ uploads songs from their device and controls the playlist and play/pause, and can pass the aux to anyone. Everyone chats and sends mood reactions (the Zuz).

## Project layout

```
apps/web          Website (Vite + React + TypeScript), hosted on Netlify
packages/core     Room logic, music sync, Firebase reads/writes  ← shared with the future Expo app
packages/zu       Zu avatars + mood drawings as data             ← shared
packages/i18n     French / English texts                          ← shared
packages/brand    Colours and fonts                               ← shared
database.rules.json / storage.rules   Firebase security rules
```

The packages contain no web-only code. The Expo app will live in `apps/mobile` and reuse them:

| Shared piece | Web | Expo (later) |
| --- | --- | --- |
| `@ziklub/zu` drawing nodes | `<svg>` (`SvgNodes.tsx`) | `react-native-svg` |
| `AudioEngine` + `PlaybackSync` (core) | `<audio>` element (`lib/audio.ts`) | `expo-audio` |
| `createZiklubApi(db, storage)` (core) | Firebase JS SDK | Firebase JS SDK with React Native auth persistence |
| `resources` (i18n) | `react-i18next` | `react-i18next` |

## Run it locally

Requirements: Node 20+, Java 11+ (for the Firebase emulators), Firebase CLI.

```bash
npm install
npm run emulators      # terminal 1: local Firebase (UI at http://localhost:4000)
npm run dev            # terminal 2: website at http://localhost:5173
```

In development the site talks to the emulators, so no real Firebase project is needed.
To test on your phone, open the "Network" address printed by `npm run dev` (same Wi-Fi).

```bash
npm test               # unit tests
npm run test:emulators # room + security rules tests (needs the emulators running)
npm run typecheck
```

## How the sync works

The server stores one small playback state per room: `{ trackId, playing, position, updatedAt }`.
Only the DJ can write it. Every phone downloads the song itself and computes where it should be:
`position + (serverNow - updatedAt)`, using Firebase's server clock offset. Once a second each phone
corrects drift: small differences by nudging the playback speed (inaudible), big ones by jumping.

## Go live

Firebase project: **ziklub** (Realtime Database in the US). The web config lives in `apps/web/src/lib/firebase.ts`.
Firebase web config is public by design; access is controlled by the security rules.

1. **Rules**: after changing `database.rules.json` or `storage.rules`, run `firebase deploy --only database,storage`.
2. **Auto-delete old songs**: in Google Cloud Storage, bucket `ziklub.firebasestorage.app` → Lifecycle → delete objects older than 1 day.
3. **Netlify**: import this GitHub repository. `netlify.toml` already sets the build command and output folder; no environment variables are needed.
4. In Firebase Authentication → Settings → Authorized domains, add the Netlify domain.

5. **Contact messages by email**: messages from `/contact` are stored in Firestore (`feedback`) and emailed
   by the `emailNewFeedback` function through [Resend](https://resend.com).
   - Put the destination address in `functions/.env.ziklub` as `NOTIFY_EMAIL=...` (this file is not committed:
     the repository is public). See `functions/.env.example`.
   - Store the Resend API key as a secret: `firebase functions:secrets:set RESEND_API_KEY --project ziklub`
   - Deploy: `firebase deploy --only functions --project ziklub`

To run the local site against the real project instead of the emulators, create `apps/web/.env.development.local` containing `VITE_USE_EMULATORS=false`.
