# cbchat-api

nodejs api is an application for cbchat-cell registry

## Build and run from local Dockerfile
### Building docker image
Copy sources in your docker host

        mkdir cbchat;
        cd cbchat;
        git clone https://github.com/startxfr/cbchat.git .

Build the container

        docker build -t cbchat-api api/

### Running local image

        docker run -d -p XXXX:8081 --name="cbchat-api-X" cbchat-api

## Other usefull informations

