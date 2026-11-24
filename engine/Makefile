CC ?= gcc
EMCC ?= emcc
CFLAGS ?= -std=c17 -Wall -Wextra -Wpedantic -Werror -O2
CORE = src/graph.c src/containers.c src/search.c
HEADER = include/net.h

.PHONY: all test sanitize wasm clean
all: build/netrecover

build:
	mkdir -p build

build/netrecover: $(CORE) src/main.c $(HEADER) | build
	$(CC) $(CFLAGS) -Iinclude $(CORE) src/main.c -o $@

build/test-net: $(CORE) tests/test_net.c $(HEADER) | build
	$(CC) $(CFLAGS) -Iinclude $(CORE) tests/test_net.c -o $@

test: build/test-net
	./build/test-net

sanitize: | build
	$(CC) $(CFLAGS) -g -fsanitize=address,undefined -fno-omit-frame-pointer -fno-pie -no-pie -Iinclude $(CORE) tests/test_net.c -o build/test-sanitize
	ASAN_OPTIONS=detect_leaks=1 ./build/test-sanitize

wasm:
	mkdir -p ../frontend/public/engine
	$(EMCC) $(CFLAGS) -Iinclude $(CORE) src/wasm_api.c --no-entry -sSTANDALONE_WASM -o ../frontend/public/engine/netrecover.wasm

clean:
	rm -rf build
