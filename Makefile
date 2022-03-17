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
	@docker-compose up --exit-code-from run-dev --build run-dev

test-contract:
	@docker-compose up --exit-code-from test-contract --build test-contract

test: test-unit test-integration

test-unit:
	@docker-compose up --exit-code-from test-unit --build test-unit

test-integration:
	@docker-compose up --exit-code-from test-integration --build test-integration

test-mutation-diff:
	@docker-compose up --exit-code-from test-mutation-diff --build test-mutation-diff

test-mutation:
	@docker-compose up --exit-code-from test-mutation --build test-mutation

test-infra:
	@docker-compose up --exit-code-from test-infra --build test-infra
