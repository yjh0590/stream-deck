// PC / 스위치 소리 전환 서버
// Voicemeeter(기본판)의 스트립 음소거를 바꿔서 프리셋을 적용한다.
// Stream Deck(Website 액션)과 폰 브라우저가 같은 주소로 접속한다.

const http = require('http');
const fs = require('fs');
const path = require('path');
const koffi = require('koffi');

const PORT = Number(process.env.PORT) || 8765;
const DLL_PATH =
  process.env.VOICEMEETER_DLL ||
  'C:\\Program Files (x86)\\VB\\Voicemeeter\\VoicemeeterRemote64.dll';

// Voicemeeter 기본판 스트립 번호
// 0 = 하드웨어 입력 1 (스위치 → 라인입력), 2 = 가상 입력 (PC 소리)
const SWITCH_STRIP = 0;
const PC_STRIP = 2;

const PRESETS = {
  both: { pc: true, switch: true },
  pc: { pc: true, switch: false },
  switch: { pc: false, switch: true },
};

// --- Voicemeeter Remote API ---
let lib;
try {
  lib = koffi.load(DLL_PATH);
} catch (err) {
  console.error(`Voicemeeter DLL을 찾을 수 없습니다: ${DLL_PATH}`);
  console.error('Voicemeeter를 설치했는지 확인하세요.');
  process.exit(1);
}

const vmLogin = lib.func('long __stdcall VBVMR_Login()');
const vmLogout = lib.func('long __stdcall VBVMR_Logout()');
const vmIsDirty = lib.func('long __stdcall VBVMR_IsParametersDirty()');
const vmSetParameters = lib.func('long __stdcall VBVMR_SetParameters(const char *script)');
const vmGetFloat = lib.func(
  'long __stdcall VBVMR_GetParameterFloat(const char *name, _Out_ float *value)'
);

const loginResult = vmLogin();
if (loginResult < 0) {
  console.error(`Voicemeeter 연결 실패 (코드 ${loginResult})`);
  process.exit(1);
}
if (loginResult === 1) {
  console.warn('Voicemeeter가 실행 중이 아닙니다. 실행하면 자동으로 연결됩니다.');
}

function applyPreset(name) {
  const p = PRESETS[name];
  const script =
    `Strip[${PC_STRIP}].Mute=${p.pc ? 0 : 1};` +
    `Strip[${SWITCH_STRIP}].Mute=${p.switch ? 0 : 1};`;
  const rc = vmSetParameters(script);
  if (rc !== 0) throw new Error(`Voicemeeter에 적용 실패 (코드 ${rc}). Voicemeeter가 켜져 있나요?`);
}

function readMute(strip) {
  const out = [0];
  const rc = vmGetFloat(`Strip[${strip}].Mute`, out);
  if (rc !== 0) throw new Error(`Voicemeeter 상태 읽기 실패 (코드 ${rc}). Voicemeeter가 켜져 있나요?`);
  return out[0] >= 0.5;
}

function getState() {
  vmIsDirty(); // 최신 값을 받으려면 읽기 전에 호출해야 한다
  const pc = !readMute(PC_STRIP);
  const sw = !readMute(SWITCH_STRIP);
  const preset =
    Object.keys(PRESETS).find((k) => PRESETS[k].pc === pc && PRESETS[k].switch === sw) || null;
  return { pc, switch: sw, preset };
}

// --- HTTP ---
const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method !== 'GET') return sendJson(res, 405, { error: 'GET만 지원합니다' });

  try {
    if (route === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(INDEX_HTML);
    }
    if (route === '/state') return sendJson(res, 200, getState());

    const m = route.match(/^\/preset\/(\w+)$/);
    if (m) {
      if (!PRESETS[m[1]]) return sendJson(res, 404, { error: `없는 프리셋: ${m[1]}` });
      applyPreset(m[1]);
      console.log(`${new Date().toLocaleTimeString()} 프리셋 적용: ${m[1]}`);
      return sendJson(res, 200, { ok: true, preset: m[1] });
    }
    return sendJson(res, 404, { error: '없는 주소입니다' });
  } catch (err) {
    return sendJson(res, 503, { error: err.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  console.log('폰에서는 http://<이 PC의 IP>:' + PORT + ' 로 접속하세요.');
});

function shutdown() {
  vmLogout();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
