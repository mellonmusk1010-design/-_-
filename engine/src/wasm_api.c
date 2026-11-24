#include <emscripten/emscripten.h>
#include "net.h"

static Graph graph;
static Result result;

EMSCRIPTEN_KEEPALIVE void reset(void) { clear_graph(&graph); }
EMSCRIPTEN_KEEPALIVE int node_add(void) { return add_node(&graph); }
EMSCRIPTEN_KEEPALIVE int node_delete(int a) { return delete_node(&graph, a); }
EMSCRIPTEN_KEEPALIVE int node_down(int a) { return exists(&graph, a) && graph.nodes[a].down; }
EMSCRIPTEN_KEEPALIVE int line_add(int a, int b, int cost) { return add_edge(&graph, a, b, cost); }
EMSCRIPTEN_KEEPALIVE int line_delete(int a, int b) { return delete_edge(&graph, a, b); }
EMSCRIPTEN_KEEPALIVE int line_cost_set(int a, int b, int cost) { return set_cost(&graph, a, b, cost); }
EMSCRIPTEN_KEEPALIVE int line_cost(int a, int b) {
    const Edge *edge = find_edge(&graph, a, b);
    return edge ? edge->cost : 0;
}
EMSCRIPTEN_KEEPALIVE int line_down(int a, int b) {
    const Edge *edge = find_edge(&graph, a, b);
    return edge && edge->down;
}
EMSCRIPTEN_KEEPALIVE int fault_set(int a, int b, int down) { return set_fault(&graph, a, b, down); }
EMSCRIPTEN_KEEPALIVE int fault_undo(void) { return undo_fault(&graph); }
EMSCRIPTEN_KEEPALIVE int undo_count(void) { return graph.history.count; }
EMSCRIPTEN_KEEPALIVE int run(int a, int b, int weighted) { return search(&graph, a, b, weighted, &result); }
EMSCRIPTEN_KEEPALIVE int path_length(void) { return result.count; }
EMSCRIPTEN_KEEPALIVE int path_node(int index) {
    return index >= 0 && index < result.count ? result.path[index] : -1;
}
EMSCRIPTEN_KEEPALIVE int route_cost(void) { return result.cost; }
EMSCRIPTEN_KEEPALIVE int reachable_count(void) { return result.reachable; }
EMSCRIPTEN_KEEPALIVE int node_count(void) { return result.total; }
EMSCRIPTEN_KEEPALIVE int step_count(void) { return result.steps; }

/* 단계의 큐, 거리, 이전 정점, 방문 배열을 읽기 전용으로 전달한다. */
EMSCRIPTEN_KEEPALIVE int step_value(int step, int field, int index) {
    if (step < 0 || step >= result.steps || index < 0 || index >= LIMIT) return -1;
    const Step *state = &result.trace[step];
    switch (field) {
        case 0: return state->current;
        case 1: return index < state->queued ? state->queue[index] : -1;
        case 2: return state->distance[index];
        case 3: return state->prev[index];
        case 4: return state->done[index];
        default: return -1;
    }
}
