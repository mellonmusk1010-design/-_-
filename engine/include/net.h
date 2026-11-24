#ifndef NET_H
#define NET_H

#define LIMIT 32
#define HISTORY 128
#define MAX_COST 10000

typedef struct Edge {
    int to, cost, down;
    struct Edge *next;
} Edge;

typedef struct { int used, down; Edge *edges; } Node;
typedef struct { int a, b, down; } Change;
typedef struct { Change values[HISTORY]; int count; } Stack;
typedef struct { int values[LIMIT]; int head, count; } Queue;
typedef struct { Node nodes[LIMIT]; Stack history; } Graph;
typedef struct {
    int current, queued, queue[LIMIT], distance[LIMIT], prev[LIMIT], done[LIMIT];
} Step;
typedef struct {
    int count, path[LIMIT], cost, reachable, total, steps;
    Step trace[LIMIT];
} Result;

int queue_empty(const Queue *queue);
int queue_full(const Queue *queue);
int enqueue(Queue *queue, int value);
int dequeue(Queue *queue, int *value);
int push(Stack *stack, Change value);
int peek(const Stack *stack, Change *value);
int pop(Stack *stack, Change *value);
int exists(const Graph *graph, int id);
Edge *find_edge(const Graph *graph, int a, int b);
int add_node(Graph *graph);
int delete_node(Graph *graph, int id);
int add_edge(Graph *graph, int a, int b, int cost);
int delete_edge(Graph *graph, int a, int b);
int set_cost(Graph *graph, int a, int b, int cost);
void clear_graph(Graph *graph);
int set_fault(Graph *graph, int a, int b, int down);
int undo_fault(Graph *graph);
int search(const Graph *graph, int source, int target, int weighted, Result *out);
#endif
