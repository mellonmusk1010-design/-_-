# -_-

# NetRecover

가상 네트워크에서 장비와 회선이 고장 났을 때 통신을 유지할 수 있는지 비교하는 한국어 시뮬레이터입니다. C17 엔진이 최소 홉과 최소 비용 경로를 계산하며, 웹 화면은 WebAssembly 엔진에서 받은 큐·거리·이전 정점 배열을 재생합니다.

## 실행

Windows 11에서는 WSL Ubuntu의 터미널에서 실행하세요. GNU Make, GCC, Emscripten(`emcc`), Node.js 22.12 이상과 npm이 필요합니다. Emscripten SDK를 사용하면 설치 후 해당 셸에서 `source /설치경로/emsdk/emsdk_env.sh`로 활성화하세요. CLI만 사용하려면 Make와 GCC로 충분합니다.

```bash
git clone https://github.com/mellonmusk1010-design/-_-.git NetRecover
cd NetRecover
make -C engine wasm
cd frontend
npm ci
npm run dev
```

터미널에 표시된 주소를 브라우저에서 엽니다. 출발·목적 장비와 알고리즘을 고른 뒤 **탐색 시작**을 누릅니다. 단계 패널에서 큐 또는 거리 배열을 확인하고, **예제 장애 발생**으로 경로가 자동으로 다시 계산되는지 비교합니다. 개별 장비나 회선을 선택하면 이름이나 비용을 편집하고 장애 또는 복구를 실행할 수 있습니다.

### CLI와 검증

저장소 루트에서 실행하세요.

```bash
make -C engine all test sanitize
./engine/build/netrecover dijkstra line
./engine/build/netrecover bfs device
./engine/build/netrecover dijkstra cut
make -C engine wasm
cd frontend
npm ci
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm test
```

브라우저 테스트에는 Chromium이 필요합니다. 설치 위치가 다르면 `CHROMIUM_PATH`를 바꿉니다. 배포용 정적 파일은 `frontend/dist`에 생성됩니다.

## 코드와 제출 자료

| 위치 | 내용 |
| --- | --- |
| `engine/src/graph.c` | 무방향 연결 리스트, 장애 상태, 메모리 해제 |
| `engine/src/containers.c` | 원형 큐, Undo 스택 |
| `engine/src/search.c` | BFS·다익스트라 탐색 기록과 경로 복원 |
| `engine/src/wasm_api.c` | 웹에서 호출하는 엔진 인터페이스 |
| `frontend/src/` | React, SVG 편집기와 시뮬레이션 결과 표시 |
| [docs](docs/) | 설계, 알고리즘, 차시별 개발노트, 작품설명서, Notion 초안 |

도달 가능 비율의 분모는 장애 장비를 포함한 전체 장비 수이며, 출발 장비가 정상이라면 출발 장비도 도달 수에 포함합니다. 모든 결과는 가상 토폴로지의 모의 실행에서 계산합니다. 토폴로지와 작업 기록은 브라우저 세션에서 유지되며 새로고침하면 기본 예제로 돌아갑니다.
