#include "net.h"

static int nearest(const Step *state) {
    int best = -1;
    for (int id = 0; id < LIMIT; id++) {
        if (!state->done[id] && state->distance[id] >= 0 &&
            (best < 0 || state->distance[id] < state->distance[best])) best = id;
    }
    return best;
}

/* 목적지를 찾은 뒤에도 탐색을 계속해 출발지의 전체 도달 범위를 구한다. */
int search(const Graph *graph, int source, int target, int weighted, Result *out) {
    *out = (Result){0};
    if (!exists(graph, source) || !exists(graph, target)) return 0;
    Step state = {0};
    Queue queue = {0};
    for (int id = 0; id < LIMIT; id++) {
        state.distance[id] = state.prev[id] = -1;
        out->total += graph->nodes[id].used;
    }
    if (graph->nodes[source].down) return 1;
    state.distance[source] = 0;
    if (!weighted) enqueue(&queue, source);

    while (1) {
        int current;
        if (weighted) {
            current = nearest(&state);
            if (current < 0) break;
        } else if (!dequeue(&queue, &current)) break;

        state.done[current] = 1;
        out->reachable++;
        for (const Edge *edge = graph->nodes[current].edges; edge; edge = edge->next) {
            int next = edge->to;
            if (edge->down || graph->nodes[next].down || state.done[next]) continue;
            int distance = state.distance[current] + (weighted ? edge->cost : 1);
            if (state.distance[next] < 0 || (weighted && distance < state.distance[next])) {
                state.distance[next] = distance;
                state.prev[next] = current;
                if (!weighted) enqueue(&queue, next);
            }
        }
        state.current = current;
        state.queued = queue.count;
        for (int i = 0; i < queue.count; i++) state.queue[i] = queue.values[(queue.head + i) % LIMIT];
        out->trace[out->steps++] = state;
    }

    if (state.distance[target] < 0) return 1;
    /* 이전 정점 배열로 거꾸로 추적한 뒤 출발지부터 읽도록 뒤집는다. */
    for (int id = target; id != -1; id = state.prev[id]) out->path[out->count++] = id;
    for (int i = 0; i < out->count / 2; i++) {
        int opposite = out->count - 1 - i;
        int value = out->path[i];
        out->path[i] = out->path[opposite];
        out->path[opposite] = value;
    }
    for (int i = 1; i < out->count; i++)
        out->cost += find_edge(graph, out->path[i - 1], out->path[i])->cost;
    return 1;
}
