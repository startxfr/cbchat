FROM startx/sv-nodejs:fc21
MAINTAINER Christophe LARUE <dev@startx.fr>

ENV TEMPO_DIR /cbchat-api

RUN mkdir -p $TEMPO_DIR \
    && chmod ug+rx $TEMPO_DIR 
VOLUME [$TEMPO_DIR]
WORKDIR $TEMPO_DIR
COPY *.json $TEMPO_DIR/
COPY *.js $TEMPO_DIR/
RUN cd $TEMPO_DIR \
    && npm install -production

EXPOSE 8081
ENTRYPOINT ["node", "app.js"]