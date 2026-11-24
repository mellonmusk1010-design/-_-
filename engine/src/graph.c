#include <stdlib.h>
#include "net.h"

int exists(const Graph *graph, int id) {
    return id >= 0 && id < LIMIT && graph->nodes[id].used;
}

Edge *find_edge(const Graph *graph, int a, int b) {
    if (!exists(graph, a) || !exists(graph, b)) return NULL;
    for (Edge *edge = graph->nodes[a].edges; edge; edge = edge->next)
        if (edge->to == b) return edge;
    return NULL;
}

int add_node(Graph *graph) {
    for (int id = 0; id < LIMIT; id++) {
        if (!graph->nodes[id].used) {
            graph->nodes[id] = (Node){.used = 1};
            return id;
        }
    }
    return -1;
}

/* 무방향 회선 하나를 양 끝 정점의 인접 리스트에 한 번씩 저장한다. */
int add_edge(Graph *graph, int a, int b, int cost) {
    if (!exists(graph, a) || !exists(graph, b) || a == b ||
        cost < 1 || cost > MAX_COST || find_edge(graph, a, b)) return 0;
    Edge *forward = malloc(sizeof *forward);
    Edge *reverse = malloc(sizeof *reverse);
    if (!forward || !reverse) {
        free(forward);
        free(reverse);
        return 0;
    }
    *forward = (Edge){b, cost, 0, graph->nodes[a].edges};
    *reverse = (Edge){a, cost, 0, graph->nodes[b].edges};
    graph->nodes[a].edges = forward;
    graph->nodes[b].edges = reverse;
    return 1;
}

/* 링크를 가리키는 포인터로 리스트의 머리와 중간을 같은 방식으로 갱신한다. */
static void unlink_edge(Node *node, int target) {
    Edge **link = &node->edges;
    while ((*link)->to != target) link = &(*link)->next;
    Edge *removed = *link;
    *link = removed->next;
    free(removed);
}

int delete_edge(Graph *graph, int a, int b) {
    if (!find_edge(graph, a, b)) return 0;
    unlink_edge(&graph->nodes[a], b);
    unlink_edge(&graph->nodes[b], a);
    graph->history.count = 0;
    return 1;
}

int delete_node(Graph *graph, int id) {
    if (!exists(graph, id)) return 0;
    while (graph->nodes[id].edges) delete_edge(graph, id, graph->nodes[id].edges->to);
    graph->nodes[id] = (Node){0};
    graph->history.count = 0;
    return 1;
}

int set_cost(Graph *graph, int a, int b, int cost) {
    Edge *edge = find_edge(graph, a, b);
    if (!edge || cost < 1 || cost > MAX_COST) return 0;
    edge->cost = find_edge(graph, b, a)->cost = cost;
    return 1;
}

void clear_graph(Graph *graph) {
    for (int id = 0; id < LIMIT; id++) delete_node(graph, id);
    graph->history.count = 0;
}

static int *fault(Graph *graph, int a, int b) {
    if (b == -1) return exists(graph, a) ? &graph->nodes[a].down : NULL;
    Edge *edge = find_edge(graph, a, b);
    return edge ? &edge->down : NULL;
}

static void apply_fault(Graph *graph, int a, int b, int down) {
    *fault(graph, a, b) = down;
    if (b != -1) *fault(graph, b, a) = down;
}

int set_fault(Graph *graph, int a, int b, int down) {
    int *state = fault(graph, a, b);
    if (!state || (down != 0 && down != 1) || *state == down ||
        !push(&graph->history, (Change){a, b, *state})) return 0;
    apply_fault(graph, a, b, down);
    return 1;
}

int undo_fault(Graph *graph) {
    Change change;
    if (!pop(&graph->history, &change)) return 0;
    apply_fault(graph, change.a, change.b, change.down);
    return 1;
}
