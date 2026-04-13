# HTTPS support

> ⚠️ **Most users don't need this.** The recommended setup is plain HTTP — see the [main README](../README.md) for the simple path. Use HTTPS only if your app cannot be configured to allow HTTP traffic in debug builds.

Ditto can serve over TLS using an auto-generated, self-signed certificate. The trade-off is that **every device that connects to Ditto has to trust the certificate first**, which is a manual, fiddly process on most platforms.

## Enabling HTTPS

Pass `--https` when starting Ditto:

```bash
./ditto --https --target https://api.example.com
```

On first run, Ditto generates `ditto.crt` and `ditto.key` in `./certs/` and reuses them on subsequent runs (so devices only need to trust the cert once). The cert covers:

- `localhost`
- `127.0.0.1`
- `::1`
- `10.0.2.2` (Android emulator host alias)
- Your machine's local network IPs (auto-detected)

| Flag | Default | Description |
|------|---------|-------------|
| `--https` | `false` | Serve over HTTPS using a self-signed certificate |
| `--certs` | `./certs` | Directory to store the generated TLS certificate |

## Trusting the certificate

### iOS Simulator

1. Drag `certs/ditto.crt` onto the running simulator (this copies it to the device).
2. Open **Settings → General → VPN & Device Management** → tap the Ditto profile → **Install**.
3. **Required second step** — go to **Settings → General → About → Certificate Trust Settings** and toggle on the entry for "Ditto Local Proxy".

Without the second step the cert is installed but not trusted for SSL.

### iOS physical device

Same as the simulator, but transfer the cert via AirDrop, email, or by hosting it (e.g. `python3 -m http.server` from the `certs/` folder).

### Android emulator

Android emulators **do not allow you to add a system-trusted CA without root access**, and apps don't trust user-installed CAs by default. There are two ways forward:

**Option A — push to the system trust store (requires `-writable-system`):**

```bash
# Close the running emulator, then start it with -writable-system
~/Library/Android/sdk/emulator/emulator -avd <YOUR_AVD_NAME> -writable-system

# In another terminal
adb root
adb remount   # may say "now reboot" — if so, adb reboot, then adb root && adb remount again

cd /path/to/ditto
HASH=$(openssl x509 -inform PEM -subject_hash_old -in certs/ditto.crt | head -1)
adb push certs/ditto.crt /system/etc/security/cacerts/${HASH}.0
adb shell chmod 644 /system/etc/security/cacerts/${HASH}.0
adb reboot
```

This only works on emulator images **without** the Play Store (look for "Google APIs", not "Google Play").

**Option B — install as a user CA + opt-in via `network_security_config.xml`:**

1. Install the cert via UI: **Settings → Security → Encryption & credentials → Install a certificate → CA certificate**.
2. Add a debug-only `network_security_config.xml` to the app you're testing so it trusts user CAs. See the main README for the snippet.

### Android physical device

Same as Option B above for the emulator. Some manufacturers add additional trust prompts.

### macOS (host machine)

Double-click `certs/ditto.crt`, add it to the Keychain, then mark it as **Always Trust**. Useful if you want to test from `curl` or a browser without `-k`.

## Why this is so hard

Self-signed certs intentionally aren't trusted — the whole point of CAs is that browsers and OSes only trust certs signed by an authority they already know. Local dev tools sit awkwardly in this gap. If your app supports cleartext for development hosts (the recommended route), you avoid the problem entirely.

## Rotating the certificate

Delete the `certs/` folder and restart Ditto. A new cert will be generated. Every device that previously trusted the old cert will need to re-trust the new one.
