.PHONY: build run stop clean run-dev test-contract test test-unit test-integration test-mutation-diff test-mutation test-infra
# serverest 

NAME_IMAGE=serverest/serverest
HOST_PORT=3000

# COMANDOS PARA USAR A IMAGEM DE PRODUÇÃO \/

default: build run

build:
	@DOCKER_BUILDKIT=1 docker build -t ${NAME_IMAGE} --target prod .

run:
	@docker run -p ${HOST_PORT}:3000 ${NAME_IMAGE}

stop:
	@docker stop -t 0 $$(docker ps -q --filter ancestor=${NAME_IMAGE})

clean:
	@docker rmi -f ${NAME_IMAGE}

# COMANDOS DE DESENVOLVIMENTO \/

run-dev:
	@docker-compose up --abort-on-container-exit --build run-dev

test-contract:
	@docker-compose up --abort-on-container-exit --build test-contract

test: test-unit test-integration

test-unit:
	@docker-compose up --abort-on-container-exit --build test-unit

test-integration:
	@docker-compose up --abort-on-container-exit  --build test-integration

test-e2e:
	@docker-compose up --abort-on-container-exit --exit-code-from test-e2e --build test-e2e

test-mutation-diff:
	@docker-compose up --abort-on-container-exit --build test-mutation-diff

test-mutation:
	@docker-compose up --abort-on-container-exit --build test-mutation

test-infra:
	@docker-compose up --abort-on-container-exit --build test-infra
