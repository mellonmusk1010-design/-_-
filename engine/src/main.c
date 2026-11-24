#include <stdio.h>
#include <string.h>
#include "net.h"

int main(int argc, char **argv) {
    if (argc > 3 || (argc > 1 && strcmp(argv[1], "bfs") && strcmp(argv[1], "dijkstra")) ||
        (argc > 2 && strcmp(argv[2], "line") && strcmp(argv[2], "device") && strcmp(argv[2], "cut"))) {
        fprintf(stderr, "Usage: netrecover [bfs|dijkstra] [line|device|cut]\n");
        return 2;
    }
    Graph graph = {0};
    Result result;
    for (int i = 0; i < 4; i++) add_node(&graph);
    if (!add_edge(&graph, 0, 1, 2) || !add_edge(&graph, 1, 3, 2) ||
        !add_edge(&graph, 0, 2, 4) || !add_edge(&graph, 2, 3, 4)) {
        clear_graph(&graph);
        return 1;
    }
    if (argc > 2) {
        if (!strcmp(argv[2], "line") || !strcmp(argv[2], "cut")) set_fault(&graph, 1, 3, 1);
        if (!strcmp(argv[2], "device")) set_fault(&graph, 1, -1, 1);
        if (!strcmp(argv[2], "cut")) set_fault(&graph, 2, -1, 1);
    }
    search(&graph, 0, 3, argc == 1 || strcmp(argv[1], "bfs"), &result);
    if (!result.count) puts("Disconnected");
    else {
        for (int i = 0; i < result.count; i++) printf("%s%d", i ? " -> " : "", result.path[i]);
        printf(" | cost %d | hops %d\n", result.cost, result.count - 1);
    }
    printf("Reachable: %d/%d\n", result.reachable, result.total);
    clear_graph(&graph);
    return 0;
}
