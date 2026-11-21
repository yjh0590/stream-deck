# 스피커 전환 (PC / 스위치 2 → EDIFIER MR4)

PC와 닌텐도 스위치 2가 EDIFIER MR4 스피커 한 쌍을 같이 쓸 때, 어느 쪽 소리를 들을지 **Stream Deck 버튼 한 번**이나 **폰**으로 바꾸는 도구입니다.

| 프리셋 | 주소 | 결과 |
|---|---|---|
| 둘 다 | `/preset/both` | PC 100 · 스위치 100 |
| PC만 | `/preset/pc` | PC 100 · 스위치 0 |
| 스위치만 | `/preset/switch` | PC 0 · 스위치 100 |

## 왜 이렇게 만들었나

- MR4는 입력 선택 버튼, 리모컨, 블루투스가 없습니다. 꽂힌 입력 소리가 전부 섞여서 나오고 볼륨 노브도 하나뿐입니다.
- 스위치 2의 볼륨은 외부에서 제어할 방법이 없습니다.
- 그래서 스위치 소리를 **PC 라인입력으로 받아** PC 안에서 섞습니다. 그러면 PC가 두 소리를 각각 켜고 끌 수 있습니다.
- Windows 기본 기능인 "이 장치 듣기"만 쓰면 PC 볼륨을 내릴 때 스위치 소리도 같이 꺼집니다. 그래서 가상 믹서인 **Voicemeeter**로 두 소리를 별도 채널로 나눴습니다.

## 동작 원리

```
PC 앱 소리 → [Voicemeeter Input] ──────┐
스위치 2 → AUX → PC 라인입력 → [입력 1] ─┼─ Voicemeeter → A1(스피커) → MR4
                                       │
        server.js (포트 8765) ← Stream Deck / 폰
```

- `server.js`가 Voicemeeter Remote API(`VoicemeeterRemote64.dll`)를 호출해 채널별 음소거(`Strip[n].Mute`)를 바꿉니다.
- Stream Deck과 폰은 둘 다 이 서버에 HTTP GET 요청을 보낼 뿐입니다. 그래서 버튼을 어디에 두든 결과가 같습니다.

## 필요한 것

- Windows 데스크톱 (뒷면에 파란색 라인입력 단자가 있어야 함)
- [Node.js](https://nodejs.org/)
- [Voicemeeter](https://vb-audio.com/Voicemeeter/) 기본판 (무료)
- Stream Deck 소프트웨어 (Stream Deck 버튼을 쓸 경우)
- 스위치 2와 PC를 잇는 3.5mm AUX선

## 파일 구성

| 파일 | 역할 |
|---|---|
| `server.js` | HTTP 서버이자 Voicemeeter 제어 |
| `public/index.html` | 폰 리모컨 화면 (버튼 3개, 3초마다 상태 갱신) |
| `start-hidden.vbs` | 콘솔 창 없이 서버 실행 (시작프로그램용) |

## 설정

### 1. 배선
스위치 2의 AUX선을 MR4가 아니라 **PC 뒷면 파란색 라인입력 단자**에 꽂습니다.
PC → MR4 선은 그대로 둡니다.

### 2. Voicemeeter 설치와 설정
1. 설치: `winget install VB-Audio.Voicemeeter` → **재부팅**
2. Windows 소리 설정 → 출력 장치를 **Voicemeeter Input**으로 바꿉니다.
3. Windows 소리 설정 → 라인입력 속성에서 **"이 장치 듣기"는 꺼 둡니다.** 켜져 있으면 소리가 두 번 납니다.
4. Voicemeeter 창
   - 오른쪽 위 **A1** → `WDM: 스피커(High Definition Audio Device)` (MR4가 연결된 출력)
   - 왼쪽 **HARDWARE INPUT 1** 이름 클릭 → `WDM: 라인 입력(...)` (스위치)
   - 가운데 **VIRTUAL INPUT** = PC 소리 (따로 설정할 것 없음)
   - Menu → **System Tray (Run at Startup)** 체크

### 3. 서버 실행
```
npm install
npm start
```
처음 실행할 때 Windows 방화벽 창이 뜨면 **개인 네트워크 허용**을 누릅니다. 폰에서 접속하려면 필요합니다.

자동 시작: `Win+R` → `shell:startup` → 열린 폴더에 `start-hidden.vbs`의 바로가기를 만듭니다.

### 4. Stream Deck
버튼마다 **시스템 → 웹사이트** 액션을 넣습니다.
- URL: `http://localhost:8765/preset/both` (`pc`, `switch`도 같은 방식)
- **"백그라운드에서 GET 요청"** 체크 (안 하면 누를 때마다 브라우저가 열립니다)

### 5. 폰
PC와 같은 Wi-Fi에서 `http://<PC IP>:8765`에 접속한 뒤 홈 화면에 추가합니다.
PC IP는 `ipconfig`의 IPv4 주소입니다. 공유기 설정에서 PC IP를 고정해 두면 주소가 바뀌지 않습니다.

## API

| 요청 | 응답 |
|---|---|
| `GET /` | 폰 리모컨 화면 |
| `GET /preset/{both\|pc\|switch}` | `{"ok":true,"preset":"pc"}` |
| `GET /state` | `{"pc":true,"switch":false,"preset":"pc"}` |

Voicemeeter가 꺼져 있으면 `503`과 오류 메시지를 돌려줍니다.

환경 변수: `PORT`(기본 `8765`), `VOICEMEETER_DLL`(DLL 경로를 바꿀 때)

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 서버가 "DLL을 찾을 수 없습니다"를 띄우고 꺼짐 | Voicemeeter 설치 여부, 설치 경로 (`VOICEMEETER_DLL`로 지정 가능) |
| 버튼을 누르면 503 오류 | Voicemeeter가 실행 중인지 |
| 스위치 소리가 안 남 | 라인입력 단자가 맞는지, Voicemeeter HARDWARE INPUT 1이 라인 입력인지 |
| 소리가 두 번 겹쳐 들림 | 라인입력의 "이 장치 듣기"가 꺼져 있는지 |
| PC 소리가 안 남 | Windows 출력 장치가 Voicemeeter Input인지, A1이 스피커인지 |
| 폰에서 접속 안 됨 | 같은 Wi-Fi인지, 방화벽에서 Node.js 개인 네트워크 허용 여부 |

## 참고

- 인증이 없어서 같은 네트워크에 있는 사람은 누구나 소리를 바꿀 수 있습니다. 집 Wi-Fi에서 쓰는 걸 전제로 만들었습니다.
- PC가 켜져 있어야 스위치 소리가 나옵니다.
- 스트립 번호(`SWITCH_STRIP`, `PC_STRIP`)는 Voicemeeter 기본판 기준입니다. Banana나 Potato에서는 가상 입력 번호가 달라집니다.
