type EngineFunction = (...args: number[]) => number
export type Engine = Record<string, EngineFunction>
export type Step = { current: number; queue: number[]; distance: number[]; previous: number[]; done: number[] }
export type Route = { path: number[]; cost: number; reachable: number; total: number; steps: Step[] }

export async function loadEngine(): Promise<Engine> {
  const response = await fetch(import.meta.env.BASE_URL + 'engine/netrecover.wasm')
  if (!response.ok) throw new Error('WebAssembly 파일을 불러오지 못했습니다.')
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {
    wasi_snapshot_preview1: { proc_exit: (status: number) => { throw new Error('엔진 종료: ' + status) } },
    env: { emscripten_notify_memory_growth: () => {} },
  })
  const engine = instance.exports as unknown as Engine
  engine._initialize?.()
  return engine
}

export function calculate(engine: Engine, source: number, target: number, weighted: boolean): Route | null {
  if (!engine.run(source, target, Number(weighted))) return null
  return {
    path: Array.from({ length: engine.path_length() }, (_, index) => engine.path_node(index)),
    cost: engine.route_cost(),
    reachable: engine.reachable_count(),
    total: engine.node_count(),
    steps: Array.from({ length: engine.step_count() }, (_, step) => {
      const read = (field: number) => Array.from({ length: 32 }, (_, index) => engine.step_value(step, field, index))
      return {
        current: engine.step_value(step, 0, 0),
        queue: read(1).filter(id => id >= 0),
        distance: read(2),
        previous: read(3),
        done: read(4),
      }
    }),
  }
}
