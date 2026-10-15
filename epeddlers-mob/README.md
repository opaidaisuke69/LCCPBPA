# ePeddlers Mobile (Administrative Field App)

React Native + Expo (SDK 57) app for Inspection Officers and Sanitary Officers.
Role-aware: tabs appear only for the permissions the signed-in officer holds.

## Prerequisites

- Node.js 18+
- Expo Go on your device, or an Android/iOS emulator
- The ePeddlers PHP backend running

## API connection

The API base URL is resolved in `src/lib/config.ts`:

- Android emulator: `http://10.0.2.2:8099/api/v1`
- iOS simulator / web: `http://localhost:8099/api/v1`
- Physical device (Expo Go): set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, e.g.

  ```powershell
  $env:EXPO_PUBLIC_API_URL = "http://192.168.1.20:8099/api/v1"
  npm start
  ```

  Make sure the PHP server is reachable on the LAN (bind to `0.0.0.0`:
  `php -S 0.0.0.0:8099 -t public`).

## Run

```powershell
npm install
npm start      # then press a (Android), i (iOS), or scan the QR with Expo Go
```

## Features

- Secure officer login (token stored in SecureStore).
- Role-aware tabs: Inspection OR Sanitary queue, Scan, Collect, Violations.
- Inspection workflow: record compliance, findings, recommendation; submit advances
  the application to sanitary review (approve), rejection, or correction.
- Sanitary workflow: independent decision; approve forwards to treasury (awaiting payment).
- QR scanning (expo-camera): resolves a permit's non-guessable reference server-side and
  shows authorized peddler info with validity, and (if permitted) payment/violation status.
  Handles camera-permission denial, invalid codes, and network errors.
- Arkabala collection: server-authoritative amount from the fee schedule, idempotency key
  to prevent double collection, digital receipt. Never confirmed until the server responds.
- Violation recording, kept separate from payments.

## Caching & safety

- `src/lib/api.ts` provides SecureStore (token) and AsyncStorage (non-sensitive cache).
- Account cache is cleared on logout.
- Financial and approval actions are only shown as confirmed after server confirmation.
- An internet connection is required; offline collection is not implied as successful.

## Structure

```
src/
  lib/        config (API URL + palette), api client, auth context
  components/ shared UI primitives
  app/
    _layout.tsx       root stack + AuthProvider
    index.tsx         officer login (redirects when authenticated)
    (app)/
      _layout.tsx     role-aware tabs + auth guard
      index.tsx       dashboard / quick actions
      queue.tsx       inspection OR sanitary queue
      scan.tsx        QR scanner
      collect.tsx     arkabala collection
      violations.tsx  violation recording
      inspection/[id].tsx
      sanitary/[id].tsx
```
