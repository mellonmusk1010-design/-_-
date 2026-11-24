#include "net.h"

int queue_empty(const Queue *queue) { return queue->count == 0; }
int queue_full(const Queue *queue) { return queue->count == LIMIT; }

int enqueue(Queue *queue, int value) {
    if (queue_full(queue)) return 0;
    queue->values[(queue->head + queue->count) % LIMIT] = value;
    queue->count++;
    return 1;
}

int dequeue(Queue *queue, int *value) {
    if (queue_empty(queue)) return 0;
    *value = queue->values[queue->head];
    queue->head = (queue->head + 1) % LIMIT;
    queue->count--;
    return 1;
}

int push(Stack *stack, Change value) {
    if (stack->count == HISTORY) return 0;
    stack->values[stack->count++] = value;
    return 1;
}

int peek(const Stack *stack, Change *value) {
    if (!stack->count) return 0;
    *value = stack->values[stack->count - 1];
    return 1;
}

int pop(Stack *stack, Change *value) {
    if (!peek(stack, value)) return 0;
    stack->count--;
    return 1;
}
