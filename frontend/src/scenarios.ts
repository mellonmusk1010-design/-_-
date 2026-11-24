export const types = { router: '라우터', switch: '스위치', pc: 'PC', server: '서버' }
export type Kind = keyof typeof types
export type Device = { id: number; name: string; kind: Kind; x: number; y: number }
type Scenario = {
  title: string
  devices: [string, Kind, number, number][]
  lines: [number, number, number][]
  faults: [number, number][]
}
const school: Scenario = {
  title: '학교 네트워크',
  devices: [
    ['교실 PC', 'pc', 96, 212], ['교실 스위치', 'switch', 252, 212],
    ['1층 라우터', 'router', 415, 111], ['2층 라우터', 'router', 415, 309],
    ['코어 스위치', 'switch', 582, 212], ['학교 서버', 'server', 731, 212],
  ],
  lines: [[0, 1, 1], [1, 2, 2], [2, 4, 2], [1, 3, 4], [3, 4, 4], [4, 5, 1]],
  faults: [[2, 4]],
}
export const scenarios: Scenario[] = [
  school,
  {
    title: '도시 재난 통신망',
    devices: [
      ['재난 상황실', 'pc', 104, 211], ['주 중계기', 'router', 328, 110],
      ['예비 중계기', 'router', 328, 310], ['소방서', 'switch', 538, 309],
      ['병원', 'server', 724, 211],
    ],
    lines: [[0, 1, 2], [0, 2, 5], [1, 4, 2], [2, 3, 2], [3, 4, 3]],
    faults: [[1, -1]],
  },
  { ...school, title: '완전한 네트워크 단절', faults: [[2, 4], [3, -1]] },
]
