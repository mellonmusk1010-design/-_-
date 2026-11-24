import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { calculate, loadEngine } from './engine'
import type { Engine, Route } from './engine'
import { scenarios, types } from './scenarios'
import type { Device, Kind } from './scenarios'
import './style.css'

const kinds = Object.keys(types) as Kind[]
type Line = { a: number; b: number; cost: number; down: boolean }
type Selection = { a: number; b: number }

function Icon({ kind }: { kind: Kind }) {
  const shapes = {
    router: <path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>,
    switch: <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 11v2m5-2v2m5-2v2"/></>,
    pc: <><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4m-5 0h10"/></>,
    server: <><rect x="4" y="3" width="16" height="8" rx="2"/><rect x="4" y="13" width="16" height="8" rx="2"/><path d="M8 7h1m-1 10h1m4-10h4m-4 10h4"/></>,
  }
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]}</svg>
}

function Console({ engine }: { engine: Engine }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [scenario, setScenario] = useState(0)
  const [source, setSource] = useState(-1)
  const [target, setTarget] = useState(-1)
  const [weighted, setWeighted] = useState(true)
  const [selection, select] = useState<Selection | null>(null)
  const [tool, setTool] = useState<'select' | 'link'>('select')
  const [anchor, setAnchor] = useState<number | null>(null)
  const [cost, setCost] = useState(1)
  const [route, setRoute] = useState<Route | null>(null)
  const [baseline, setBaseline] = useState<Route | null>(null)
  const [frame, setFrame] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [events, setEvents] = useState<string[]>([])
  const [zoom, setZoom] = useState(1)
  const [tab, setTab] = useState<'trace' | 'events'>('trace')
  const [info, setInfo] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null)
  const step = frame >= 0 ? route?.steps[frame] : undefined
  const name = (id: number) => devices.find(device => device.id === id)?.name ?? '—'
  const log = (event: string) => setEvents(previous => [event, ...previous].slice(0, 100))
  const lines: Line[] = []
  devices.forEach(({ id: a }, index) => devices.slice(index + 1).forEach(({ id: b }) => {
    const cost = engine.line_cost(a, b)
    if (cost) lines.push({ a, b, cost, down: Boolean(engine.line_down(a, b)) })
  }))
  const selectedNode = selection?.b === -1 ? devices.find(node => node.id === selection.a) : undefined
  const selectedLine = lines.find(({ a, b }) => a === selection?.a && b === selection.b)
  const downCount = devices.filter(({ id }) => engine.node_down(id)).length + lines.filter(line => line.down).length
  const routeText = (value: Route | null) => value?.path.length ? value.path.map(name).join(' → ') : value ? '통신 불가' : '—'

  function show(result: Route | null, start = false) {
    setRoute(result)
    setPlaying(false)
    setFrame(start && result?.steps.length ? 0 : -1)
  }

  function load(index: number) {
    const config = scenarios[index]
    engine.reset()
    const nodes = config.devices.map(([name, kind, x, y]) => ({ id: engine.node_add(), name, kind, x, y }))
    for (const [a, b, weight] of config.lines) {
      if (!engine.line_add(a, b, weight)) throw new Error('시나리오 회선을 생성하지 못했습니다.')
    }
    const end = nodes.at(-1)!.id
    setDevices(nodes)
    setScenario(index)
    setSource(0)
    setTarget(end)
    setBaseline(null)
    select(null)
    setTool('select')
    setAnchor(null)
    setZoom(1)
    setEvents([config.title + ' 시나리오 로드'])
    show(calculate(engine, 0, end, weighted))
  }

  useEffect(() => { load(0) }, [])

  useEffect(() => {
    if (!playing || !route?.steps.length) return
    const timer = window.setTimeout(() => {
      if (frame < route.steps.length - 1) setFrame(frame + 1)
      else {
        setFrame(-1)
        setPlaying(false)
      }
    }, 700 / speed)
    return () => window.clearTimeout(timer)
  }, [playing, frame, route, speed])

  function refresh(a = source, b = target, useWeights = weighted) {
    setBaseline(null)
    show(calculate(engine, a, b, useWeights))
  }

  function applyFaults(changes: [number, number][], down: number) {
    const before = calculate(engine, source, target, weighted)
    let applied = 0
    for (const [a, b] of changes) applied += engine.fault_set(a, b, down)
    if (!applied) {
      log('상태 변경 없음. 현재 상태 또는 Undo 한도를 확인하세요.')
      return
    }
    setBaseline(before)
    show(calculate(engine, source, target, weighted))
    log(`${down ? '장애' : '복구'} · ${changes.map(([a, b]) => b < 0 ? name(a) : name(a) + ' ↔ ' + name(b)).join(', ')} (${applied}건)`)
  }

  function undo() {
    const before = calculate(engine, source, target, weighted)
    if (!engine.fault_undo()) return
    setBaseline(before)
    show(calculate(engine, source, target, weighted))
    log('최근 장애 또는 복구 작업 되돌림')
  }

  function pick(id: number) {
    if (tool === 'select') {
      select({ a: id, b: -1 })
      return
    }
    if (anchor === null) {
      setAnchor(id)
      return
    }
    if (anchor === id) { setAnchor(null); return }
    if (Number.isInteger(cost) && engine.line_add(anchor, id, cost)) {
      log('회선 연결 · ' + name(anchor) + ' ↔ ' + name(id))
      refresh()
    } else log('회선 연결 실패 · 중복 회선 또는 비용 범위(1–10000)를 확인하세요.')
    setAnchor(null)
  }

  function add(kind: Kind) {
    const id = engine.node_add()
    if (id < 0) { log('최대 장비 수 32대에 도달했습니다.'); return }
    setDevices([...devices, { id, kind, name: types[kind] + ' ' + (id + 1), x: 92 + (id % 7) * 103, y: 380 - Math.floor(id / 7) * 70 }])
    select({ a: id, b: -1 })
    log(types[kind] + ' 추가')
    refresh()
  }

  function remove() {
    if (!selection) return
    const { a, b } = selection
    if (b === -1) {
      if (!engine.node_delete(a)) return
      const rest = devices.filter(node => node.id !== a)
      const nextSource = source === a ? rest[0]?.id ?? -1 : source
      const nextTarget = target === a ? rest.at(-1)?.id ?? -1 : target
      setDevices(rest)
      setSource(nextSource)
      setTarget(nextTarget)
      if (anchor === a) setAnchor(null)
      refresh(nextSource, nextTarget)
    } else {
      if (!engine.line_delete(a, b)) return
      refresh()
    }
    select(null)
    log('선택 항목 삭제 · 장애 Undo 기록 초기화')
  }

  function pointer(event: PointerEvent<SVGElement>) {
    const matrix = svg.current?.getScreenCTM()
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : new DOMPoint()
  }

  function onMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return
    const { id, dx, dy } = drag.current
    const point = pointer(event)
    setDevices(previous => previous.map(node => node.id === id ? {
      ...node, x: Math.max(32, Math.min(788, point.x - dx)), y: Math.max(32, Math.min(393, point.y - dy)),
    } : node))
  }

  const delta = route?.path.length && baseline?.path.length && baseline.cost
    ? ((route.cost - baseline.cost) / baseline.cost * 100).toFixed(1) + '%' : '—'

  return <>
    <header>
      <div className="brand"><span className="mark">⌁</span><div>NetRecover<small>네트워크 복구 시뮬레이터</small></div></div>
      <div className={route?.path.length ? 'health' : 'health bad'}><i/> {route?.path.length ? '통신 가능' : '통신 불가'}</div>
      <div className="header-actions">
        <select aria-label="시나리오" value={scenario} onChange={event => load(Number(event.target.value))}>
          {scenarios.map((item, index) => <option key={item.title} value={index}>{item.title}</option>)}
        </select>
        <button onClick={() => load(scenario)}>초기화</button>
        <button onClick={() => setInfo(true)}>프로젝트 정보</button>
      </div>
    </header>
    <main>
      <aside className="tools panel">
        <section><h2>장비 추가</h2><div className="palette">{kinds.map(kind =>
          <button key={kind} onClick={() => add(kind)}><Icon kind={kind}/>{types[kind]}</button>)}</div></section>
        <section><h2>편집 도구</h2>
          <div className="row"><button className={tool === 'select' ? 'active' : ''} onClick={() => { setTool('select'); setAnchor(null) }}>선택</button>
          <button className={tool === 'link' ? 'active' : ''} onClick={() => setTool('link')}>연결</button></div>
          {tool === 'link' && <label>연결 비용<input type="number" min="1" max="10000" value={cost} onChange={event => setCost(Number(event.target.value))}/></label>}
        </section>
        <section><h2>경로 탐색</h2>
          <label>알고리즘<select value={Number(weighted)} onChange={event => { const value = event.target.value === '1'; setWeighted(value); refresh(source, target, value) }}><option value="1">Dijkstra · 최소 비용</option><option value="0">BFS · 최소 홉</option></select></label>
          <label>출발 장비<select value={source} onChange={event => { const id = Number(event.target.value); setSource(id); refresh(id, target) }}>{devices.map(node => <option value={node.id} key={node.id}>{node.name}</option>)}</select></label>
          <label>목적 장비<select value={target} onChange={event => { const id = Number(event.target.value); setTarget(id); refresh(source, id) }}>{devices.map(node => <option value={node.id} key={node.id}>{node.name}</option>)}</select></label>
          <button className="primary full" disabled={source < 0 || target < 0} onClick={() => {
            show(calculate(engine, source, target, weighted), true)
            setTab('trace')
            log((weighted ? 'Dijkstra' : 'BFS') + ' 탐색 · ' + name(source) + ' → ' + name(target))
          }}>▷ 탐색 시작</button>
        </section>
        <section><h2>장애 시뮬레이션</h2>
          <button className="danger full" onClick={() => applyFaults(scenarios[scenario].faults, 1)}>예제 장애 발생</button>
          <button className="full" disabled={!engine.undo_count()} onClick={undo}>↶ 장애 작업 되돌리기</button>
        </section>
      </aside>
      <div className="center">
        <section className="panel topology">
          <div className="bar"><div><h2>네트워크 토폴로지</h2><small>장비 {devices.length} · 회선 {lines.length} · 장애 {downCount}</small></div>
            <div className="row zoom"><button aria-label="축소" onClick={() => setZoom(Math.max(.75, zoom - .25))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label="확대" onClick={() => setZoom(Math.min(2, zoom + .25))}>+</button></div>
          </div>
          <div className="canvas"><svg ref={svg} viewBox={`${410 - 410 / zoom} ${220 - 220 / zoom} ${820 / zoom} ${440 / zoom}`} onPointerMove={onMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
            {lines.map(line => {
              const a = devices.find(node => node.id === line.a)!
              const b = devices.find(node => node.id === line.b)!
              const down = line.down || engine.node_down(a.id) || engine.node_down(b.id)
              const active = frame === -1 && route?.path.some((id, i, path) => (id === a.id && path[i+1] === b.id) || (id === b.id && path[i+1] === a.id))
              const middleX = (a.x + b.x) / 2, middleY = (a.y + b.y) / 2
              return <g key={a.id + '-' + b.id} className={`line ${down ? 'down' : active ? 'path' : ''} ${selectedLine === line ? 'selected' : ''}`} tabIndex={0} role="button" aria-label={a.name + ' ↔ ' + b.name + ' 회선'} onClick={() => select({ a: a.id, b: b.id })} onKeyDown={event => { if (event.key === 'Enter') select({ a: a.id, b: b.id }) }}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>
                <line className="hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>
                <rect x={middleX - 17} y={middleY - 12} width="34" height="24" rx="4"/>
                <text x={middleX} y={middleY + 4}>{line.cost}</text>
              </g>
            })}
            {devices.map(node => <g key={node.id} className={`node ${engine.node_down(node.id) ? 'down' : step?.current === node.id || anchor === node.id ? 'current' : step?.done[node.id] ? 'visited' : step && step.distance[node.id] >= 0 ? 'pending' : frame === -1 && route?.path.includes(node.id) ? 'path' : ''} ${selectedNode?.id === node.id ? 'selected' : ''}`}
              transform={`translate(${node.x} ${node.y})`} tabIndex={0} role="button" aria-label={node.name}
              onKeyDown={event => { if (event.key === 'Enter') pick(node.id) }}
              onPointerDown={event => {
                if (event.button !== 0) return
                pick(node.id)
                if (tool === 'select') {
                  const point = pointer(event)
                  drag.current = { id: node.id, dx: point.x - node.x, dy: point.y - node.y }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }
              }}>
              <rect x="-25" y="-25" width="50" height="50" rx="10"/>
              <g transform="translate(-11 -11)"><Icon kind={node.kind}/></g>
              <text y="43">{node.name}</text>
            </g>)}
          </svg></div>
          <div className="legend"><span>● 최종 경로</span><span>● 탐색 중</span><span>● 장애 구간</span>{tool === 'link' && <span>{anchor === null ? '첫 장비 선택' : name(anchor) + '에 연결할 장비 선택'}</span>}</div>
        </section>
        <section className="panel trace">
          <div className="bar"><div className="row"><button className={tab === 'trace' ? 'active' : ''} onClick={() => setTab('trace')}>알고리즘 단계</button><button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>작업 기록</button></div>
            <small>{weighted ? 'DIJKSTRA' : 'BFS'}</small>
          </div>
          {tab === 'trace' ? <>
            <div className="controls row">
              <button aria-label="이전 단계" disabled={!route?.steps.length} onClick={() => { setPlaying(false); setFrame(frame < 0 ? route!.steps.length - 1 : Math.max(0, frame - 1)) }}>‹</button>
              <button disabled={!route?.steps.length} onClick={() => { if (!playing && frame < 0) setFrame(0); setPlaying(!playing) }}>{playing ? '일시정지' : '재생'}</button>
              <button aria-label="다음 단계" disabled={!route?.steps.length} onClick={() => { setPlaying(false); setFrame(frame + 1 >= route!.steps.length ? -1 : frame + 1) }}>›</button>
              <select aria-label="재생 속도" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value=".5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select>
              <small>{step ? `${frame + 1} / ${route!.steps.length} · 처리 완료 ${name(step.current)}` : '최종 경로'}</small>
            </div>
            <div className="trace-content"><p><b>방문 순서</b> {route?.steps.slice(0, step ? frame + 1 : undefined).map(item => name(item.current)).join(' → ') || '—'}</p>
            {step && <>
              {!weighted && <p><b>BFS 큐</b> {step.queue.map(name).join(' → ') || '비어 있음'}</p>}
              {weighted && <p><b>다음 후보</b> {devices.filter(node => !step.done[node.id] && step.distance[node.id] >= 0).map(node => name(node.id)).join(', ') || '—'}</p>}
              <table><thead><tr><th>정점</th><th>{weighted ? '거리' : '홉'}</th><th>이전 정점</th><th>상태</th></tr></thead><tbody>
                {devices.map(({ id }) => <tr key={id}><td>{name(id)}</td><td>{step.distance[id] < 0 ? '∞' : step.distance[id]}</td><td>{name(step.previous[id])}</td><td>{step.done[id] ? '방문 완료' : step.distance[id] >= 0 ? '대기' : '미발견'}</td></tr>)}
              </tbody></table>
            </>}
            </div>
          </> : <ol className="events">{events.map((event, index) => <li key={index}>{event}</li>)}</ol>}
        </section>
      </div>
      <aside className="panel inspector">
        <section><h2>선택 항목</h2>
          {!selection && <p className="muted">토폴로지에서 장비 또는 회선을 선택하세요.</p>}
          {selectedNode && <><p>{types[selectedNode.kind]} · {engine.node_down(selectedNode.id) ? '장애' : '정상'}</p>
            <label>장비 이름<input maxLength={24} value={selectedNode.name} onChange={event => setDevices(devices.map(node => node.id === selectedNode.id ? { ...node, name: event.target.value } : node))}/></label></>}
          {selectedLine && <><p>{name(selectedLine.a)} ↔ {name(selectedLine.b)} · {selectedLine.down ? '장애' : '정상'}</p>
            <form key={selectedLine.a + ':' + selectedLine.b} onSubmit={event => {
              event.preventDefault()
              const value = Number(new FormData(event.currentTarget).get('cost'))
              if (Number.isInteger(value) && engine.line_cost_set(selectedLine.a, selectedLine.b, value)) {
                refresh()
                log('회선 비용 변경 · ' + value)
              }
            }}>
              <label>회선 비용<input name="cost" type="number" min="1" max="10000" required defaultValue={selectedLine.cost}/></label>
              <button className="full">비용 적용</button>
            </form></>}
          {selection && <div className="row"><button className="danger" onClick={() => applyFaults([[selection.a, selection.b]], (selectedLine?.down || (selectedNode && engine.node_down(selectedNode.id))) ? 0 : 1)}>
            {selectedLine?.down || (selectedNode && engine.node_down(selectedNode.id)) ? '복구' : '장애 발생'}
          </button><button onClick={remove}>삭제</button></div>}
        </section>
        <section><h2>경로 결과</h2><p className="route">{routeText(route)}</p>
          <dl><dt>전체 비용</dt><dd>{route?.path.length ? route.cost : '—'}</dd>
            <dt>홉 / 경유 장비</dt><dd>{route?.path.length ? `${route.path.length - 1} / ${Math.max(0, route.path.length - 2)}` : '—'}</dd>
            <dt>도달 가능 장비</dt><dd>{route?.total ? `${route.reachable}/${route.total} · ${Math.round(route.reachable / route.total * 100)}%` : '—'}</dd></dl>
        </section>
        <section><h2>장애 전후 비교</h2>
          {baseline ? <><dl><dt>이전 비용</dt><dd>{baseline.path.length ? baseline.cost : '—'}</dd><dt>비용 변화율</dt><dd>{delta}</dd>
            <dt>통신 복구</dt><dd>{route?.path.length ? '성공' : '실패'}</dd></dl>
            <small>변경 전</small><p>{routeText(baseline)}</p><small>변경 후</small><p>{routeText(route)}</p></> : <p className="muted">장애 또는 복구 작업 후 경로를 비교합니다.</p>}
          <small>가상 토폴로지의 시뮬레이션 결과</small>
        </section>
      </aside>
    </main>
    {info && <div className="overlay" onClick={() => setInfo(false)}><section className="panel dialog" role="dialog" aria-modal="true" aria-label="프로젝트 정보" onClick={event => event.stopPropagation()}>
      <h2>NetRecover</h2><p>C17 엔진으로 가상 네트워크의 장애와 대체 경로를 실험합니다.</p><p>SDG 9 · 대체 회선과 장비를 통한 인프라 복원력</p><p>SDG 11 · 재난 통신망의 연결 유지와 도달 가능 비율</p><button onClick={() => setInfo(false)}>닫기</button>
    </section></div>}
  </>
}

function App() {
  const [state, setState] = useState<{ engine?: Engine; error?: string }>({})
  useEffect(() => { loadEngine().then(engine => setState({ engine })).catch(error => setState({ error: String(error) })) }, [])
  return state.engine ? <Console engine={state.engine}/> : <div className="startup"><h1>NetRecover</h1><p>{state.error ?? 'WebAssembly 엔진을 불러오는 중입니다.'}</p>{state.error && <button onClick={() => window.location.reload()}>다시 시도</button>}</div>
}
createRoot(document.getElementById('root')!).render(<App/>)
