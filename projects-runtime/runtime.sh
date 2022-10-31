#!/bin/sh
dockerd --host tcp://0.0.0.0:2376 --tls=false & sleep 20

export DOCKER_HOST=localhost:2376
docker network create "$FULIB_PROJECTS_NETWORK"

if [ -n "$DOCKER_REGISTRY" ]
then
	docker login "$DOCKER_REGISTRY" -u "$DOCKER_USERNAME" -p "$DOCKER_PASSWORD"
fi

docker run -p 8080:80 --network="$FULIB_PROJECTS_NETWORK" "$FULIB_PROJECTS_PROXY_IMAGE" &
wait
