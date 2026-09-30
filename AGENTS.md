# Project Architecture Rules

- Use `useCanGoLive` as the single client-side source for live-selling approval state so every entry point stays synchronized with admin changes.
- Save broadcaster camera snapshots in `live_streams.thumbnail_url` via the existing media uploader; the Live and Shop listings share this persisted preview so finished streams retain their image.