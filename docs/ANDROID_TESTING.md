# Android demonstration testing

Status: desktop Chromium/mobile viewport checks were executed. No physical Android phone is available through ADB. The installed SDK reports only emulator-5554. An attempted emulator port-forwarding/browser-launch sequence was rejected by automatic approval review as "blocked by policy"; no more specific reason was provided. A subsequent read-only reverse-list check was empty. No emulator or physical-device browser test is claimed, and no firewall/network-profile change was made.

## Preferred: USB forwarding, without LAN exposure

Use the existing [local startup commands](FINAL_RELEASE.md#dependable-demo): frontend at localhost:5173, compiled backend at localhost:8000, VITE_USE_MOCKS=false, VITE_API_BASE_URL=http://localhost:8000/api/v1 and exact backend FRONTEND_URL=http://localhost:5173. Fresh installation now includes root and backend dependencies plus the root infrastructure build.

1. Connect your Android phone by USB. On that phone enable Developer options and USB debugging, and accept only the trusted development computer's debugging prompt.
2. On desktop Chrome open chrome://inspect/#devices, enable Discover USB devices, then Port forwarding.
3. Enable forwarding and add device port 5173 -> localhost:5173 and device port 8000 -> localhost:8000. Both are necessary: the browser's API request also originates on the phone.
4. On Android Chrome open http://localhost:5173/heatlab. Check http://localhost:8000/api/v1/health independently if API calls fail. Keep the USB cable connected.
5. After testing, disable forwarding and revoke USB debugging authorization if this was temporary.

Chrome documents this USB path, which does not depend on LAN configuration, in its [port forwarding guide](https://developer.chrome.com/docs/devtools/remote-debugging/local-server/). Geolocation requires a secure context; localhost is a potentially trustworthy origin, but device permission, location services and browser policy still apply. See [MDN geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation) and [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts). Forwarding does not grant location permission or prove GPS accuracy.

## Optional temporary LAN test

This was **prepared, not executed**. The observed computer network profile is Public. Its classification and firewall were left unchanged. Use a trusted private LAN and an exact known phone IP before applying the temporary commands below; do not use router forwarding, public tunnels or a global firewall disable. Check for any pre-existing broad Node firewall allow rules before assuming a newly scoped rule restricts all access.

Record the actual PC and phone IPv4 addresses from the network settings. In each applicable terminal set the same PC address, e.g. by entering it when prompted (do not paste an invented address):

```powershell
$pcLanIp=Read-Host 'Exact development computer LAN IPv4 address'
```

Stop the normal backend/frontend first so there is still one Express server. Backend terminal:

```powershell
Set-Location D:\codestorm\backend
$env:PORT='8000'
$env:FRONTEND_URL="http://${pcLanIp}:5173"
npm.cmd start
```

The existing backend listener accepts connections on platform interfaces; it does not need a second Express app. Frontend terminal:

```powershell
Set-Location D:\codestorm\frontend
$env:VITE_API_BASE_URL="http://${pcLanIp}:8000/api/v1"
$env:VITE_USE_MOCKS='false'
npm.cmd run dev -- --host $pcLanIp --port 5173 --strictPort
```

If Windows Firewall needs a temporary rule, use an elevated PowerShell on a trusted Private network only. Set the exact PC and phone addresses here too:

```powershell
$pcLanIp=Read-Host 'Exact development computer LAN IPv4 address'
$phoneLanIp=Read-Host 'Exact test phone LAN IPv4 address'
$nodeExecutable=(Get-Command node.exe).Source
New-NetFirewallRule -Name 'SunShield-Temporary-Phone-Test' `
  -DisplayName 'SunShield temporary exact phone test' -Direction Inbound `
  -Action Allow -Protocol TCP -LocalPort 5173,8000 `
  -LocalAddress $pcLanIp -RemoteAddress $phoneLanIp -Profile Private `
  -Program $nodeExecutable -EdgeTraversalPolicy Block
```

On the phone open http://PC_IP:5173/heatlab using the actual address. A plain HTTP LAN-IP origin is not a secure context for GPS; a denied/unavailable location result there is expected. Use supported city selection for the demo, or USB localhost/trusted HTTPS when testing real geolocation. Do not disable browser security flags to bypass this limitation.

Cleanup immediately after the LAN test:

```powershell
Remove-NetFirewallRule -Name 'SunShield-Temporary-Phone-Test'
```

Stop both LAN processes. Restart with the ordinary localhost startup instructions and exact localhost CORS origin; remove the temporary VITE_API_BASE_URL/FRONTEND_URL process variables or close those terminals. No persistent environment file or committed security setting needs modification.

## Phone checklist and evidence

- Record actual phone model, Android/Chrome versions, test time, connection path and whether window.isSecureContext is true (inspect through desktop DevTools).
- Fresh direct HeatLab load and refresh; default 35 C / 50% / 5 km/h comparison; actual CRITICAL/HIGH outputs and 40.68 C heat index.
- Visible SIMULATION and prototype limitations; edit one scenario, evaluate, reset, confirm worker profile is unchanged.
- English/Hindi/Marathi glyphs and critical text, portrait/landscape, scrolling, touch controls and virtual keyboard behavior.
- Onboarding, manual city selection, back/review/save/edit, refresh and language persistence with a saved profile.
- GPS allow/deny/timeout only in an eligible secure context; confirm actual coordinates update requests, and record device timezone. Do not substitute mocked browser GPS for a physical test.
- SOS is reachable without profile/API; inspect the tel:112 link without placing a test emergency call.
- Weather/planner/Safe Zone errors remain honest while unavailable. No live weather/database or community-write success is claimed from this test.

Physical-device result: **NOT EXECUTED**. Emulator result: **NOT EXECUTED (tool policy rejection)**. Desktop Chromium responsive simulation is recorded separately in [acceptance report](FINAL_ACCEPTANCE.md).
