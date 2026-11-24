#include <assert.h>
#include <stdio.h>
#include "net.h"

static void containers(void) {
    Queue queue = {0};
    Stack stack = {0};
    int value;
    Change change;
    assert(!dequeue(&queue, &value) && !pop(&stack, &change));
    for (int i = 0; i < LIMIT; i++) assert(enqueue(&queue, i));
    assert(queue_full(&queue) && !enqueue(&queue, 0));
    assert(dequeue(&queue, &value) && value == 0 && enqueue(&queue, LIMIT));
    for (int i = 1; i <= LIMIT; i++) assert(dequeue(&queue, &value) && value == i);
    assert(queue_empty(&queue));
    for (int i = 0; i < HISTORY; i++) assert(push(&stack, (Change){i, -1, 0}));
    assert(!push(&stack, (Change){0}));
    assert(peek(&stack, &change) && change.a == HISTORY - 1);
    for (int i = HISTORY - 1; i >= 0; i--) assert(pop(&stack, &change) && change.a == i);
    assert(!pop(&stack, &change));
}

int main(void) {
    Graph graph = {0};
    Result result;
    containers();
    for (int i = 0; i < 5; i++) assert(add_node(&graph) == i);
    assert(add_edge(&graph, 0, 3, 20));
    assert(add_edge(&graph, 0, 1, 2));
    assert(add_edge(&graph, 1, 2, 2));
    assert(add_edge(&graph, 2, 3, 2));
    assert(!add_edge(&graph, 3, 0, 3));
    assert(!add_edge(&graph, 0, 4, 0) && !add_edge(&graph, 0, 4, MAX_COST + 1));
    assert(!set_cost(&graph, 0, 3, -1));
    assert(search(&graph, 0, 3, 0, &result) && result.cost == 20 && result.count == 2);
    assert(result.steps == 4 && result.trace[0].queued == 2 && result.trace[0].prev[3] == 0);
    assert(search(&graph, 0, 3, 1, &result) && result.cost == 6 && result.count == 4);
    assert(result.trace[3].distance[3] == 6 && result.trace[3].prev[3] == 2);
    assert(set_fault(&graph, 1, 2, 1) && find_edge(&graph, 2, 1)->down);
    assert(search(&graph, 0, 3, 1, &result) && result.cost == 20);
    assert(undo_fault(&graph) && !find_edge(&graph, 1, 2)->down);
    assert(set_fault(&graph, 1, -1, 1));
    assert(search(&graph, 0, 3, 1, &result) && result.cost == 20);
    assert(set_fault(&graph, 0, 3, 1));
    assert(search(&graph, 0, 3, 1, &result) && !result.count && result.reachable == 1);
    assert(undo_fault(&graph) && undo_fault(&graph) && !undo_fault(&graph));
    assert(search(&graph, 2, 2, 1, &result) && result.count == 1 && !result.cost);
    assert(!search(&graph, 0, 31, 0, &result));
    assert(search(&graph, 0, 4, 0, &result) && !result.count && result.reachable == 4);
    assert(set_cost(&graph, 3, 0, 5));
    assert(search(&graph, 0, 3, 1, &result) && result.cost == 5);
    assert(delete_edge(&graph, 0, 3) && !find_edge(&graph, 3, 0));
    assert(delete_node(&graph, 2) && !find_edge(&graph, 3, 2));
    assert(search(&graph, 0, 3, 1, &result) && !result.count);
    assert(set_fault(&graph, 0, -1, 1));
    assert(search(&graph, 0, 3, 1, &result) && !result.reachable);
    clear_graph(&graph);
    for (int i = 0; i < LIMIT; i++) {
        assert(!graph.nodes[i].used && !graph.nodes[i].edges);
        assert(add_node(&graph) == i);
    }
    assert(add_node(&graph) == -1);
    clear_graph(&graph);
    puts("NetRecover engine checks passed.");
}
