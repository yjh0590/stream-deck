# 스피커 전환 (PC / 스위치 2 → EDIFIER MR4)

Stream Deck 버튼이나 폰 브라우저로 세 가지 프리셋을 전환한다.

| 프리셋 | 주소 | 결과 |
|---|---|---|
| 둘 다 | `/preset/both` | PC 100 · 스위치 100 |
| PC만 | `/preset/pc` | PC 100 · 스위치 0 |
| 스위치만 | `/preset/switch` | PC 0 · 스위치 100 |

```
PC 앱 소리 → [Voicemeeter Input] ──────┐
스위치 2 → AUX → PC 라인입력 → [입력 1] ─┼─ Voicemeeter → A1(스피커) → MR4
                                       │
        server.js (포트 8765) ← Stream Deck / 폰
```

## 1. 배선
스위치 2의 AUX선을 MR4가 아니라 **PC 뒷면 파란색 라인입력 단자**에 꽂는다.
PC → MR4 선은 그대로 둔다.

## 2. Voicemeeter 설치와 설정
1. 설치: `winget install VB-Audio.Voicemeeter` → **재부팅**
2. Windows 소리 설정 → 출력 장치를 **Voicemeeter Input**으로 바꾼다.
3. Windows 소리 설정 → 라인입력 속성에서 **"이 장치 듣기"는 꺼 둔다.** 켜져 있으면 소리가 두 번 난다.
4. Voicemeeter 창
   - 오른쪽 위 **A1** → `WDM: 스피커(High Definition Audio Device)` (MR4가 연결된 출력)
   - 왼쪽 **HARDWARE INPUT 1** 이름 클릭 → `WDM: 라인 입력(...)` (스위치)
   - 가운데 **VIRTUAL INPUT** = PC 소리 (따로 설정할 것 없음)
   - Menu → **System Tray (Run at Startup)** 체크

## 3. 서버 실행
```
npm install
npm start
```
처음 실행할 때 Windows 방화벽 창이 뜨면 **개인 네트워크 허용**을 누른다. 폰에서 접속하려면 필요하다.

자동 시작: `Win+R` → `shell:startup` → 열린 폴더에 `start-hidden.vbs`의 바로가기를 만든다.

## 4. Stream Deck
버튼마다 **시스템 → 웹사이트** 액션을 넣는다.
- URL: `http://localhost:8765/preset/both` (`pc`, `switch`도 같은 방식)
- **"백그라운드에서 GET 요청"** 체크 (안 하면 브라우저가 열린다)

## 5. 폰
PC와 같은 Wi-Fi에서 `http://<PC IP>:8765` 접속 → 홈 화면에 추가.
PC IP는 `ipconfig`의 IPv4 주소다. 공유기 설정에서 PC IP를 고정해 두면 주소가 바뀌지 않는다.

## 참고
- 인증이 없다. 같은 네트워크에 있는 사람은 누구나 음소거를 바꿀 수 있다. 집 Wi-Fi 기준으로 만들었다.
- 스트립 번호(`SWITCH_STRIP`, `PC_STRIP`)는 Voicemeeter 기본판 기준이다. Banana나 Potato에서는 가상 입력 번호가 달라진다.
