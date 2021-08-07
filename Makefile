.PHONY: build build\run run stop clean test-contract test test-mutation-diff test-mutation
# serverest 

NAME_IMAGE=serverest
PORT=3000

build:
	@DOCKER_BUILDKIT=1 docker build -t ${NAME_IMAGE}/${NAME_IMAGE} .

build/run: build run	

run:
	@docker run -p  ${PORT}:3000 ${NAME_IMAGE}/${NAME_IMAGE}

stop:
	@docker stop -t 0 $$(docker ps -q  --filter ancestor=${NAME_IMAGE}/${NAME_IMAGE})

clean:
	@docker rmi -f serverest/serverest

test-contract:
	@docker-compose up --build test-contract

test:
	@docker-compose up --build test

test-mutation-diff:
	@docker-compose up --build test-mutation-diff

test-mutation:
	@docker-compose up --build test-mutation
