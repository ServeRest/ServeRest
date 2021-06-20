.PHONY: build build\run run stop clean test-contract test test-mutation-diff
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
	@docker-compose run --rm test-contract

test:
	@docker-compose run --rm test

test-mutation-diff:
	@docker-compose run --rm test-mutation-diff
