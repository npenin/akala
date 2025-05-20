FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/akala
# RUN npm i -g yarn
COPY package.json package.json
# COPY ash.sh /usr/bin/ash-env
RUN mkdir /root/.yarn && ln -s /usr/src/akala/.yarn /root/.yarn
VOLUME ["/usr/src/akala/db"]
WORKDIR /usr/src/akala
RUN chown -R node .
USER node
WORKDIR /usr/src/akala
RUN mkdir /usr/src/akala/db && \
    yarn set version berry && \
    yarn config set nodeLinker node-modules && \
    yarn add @akala/pm
ENV PATH=/usr/src/akala/node_modules/.bin:${PATH}
ENV NODE_ENV=production
ENV DEBUG=*
RUN akala --configFile=/usr/src/akala/db/.akala.json plugins add @akala/config/akala && \
    akala --configFile=/usr/src/akala/db/.akala.json plugins add @akala/commands/akala && \
    akala --configFile=/usr/src/akala/db/.akala.json plugins add @akala/pm/akala
ENTRYPOINT ["yarn", "start"]
CMD [ "tcp", "--tcpPort=31416"]
EXPOSE 31416
