FROM node:22.15.1-alpine3.21
ENV NODE_ENV=production
RUN mkdir /root/.yarn && ln -s /akala/.yarn /root/.yarn
VOLUME ["/akala/db"]
COPY package.json /akala/package.json
RUN chown -R node /akala
USER node
WORKDIR /akala
RUN mkdir -p /akala/db && \
    yarn set version berry && \
    yarn config set nodeLinker node-modules && \
    yarn config set enableGlobalCache false && \
    yarn config set compressionLevel mixed && \
    yarn set version latest && \
    yarn add @akala/pm @akala/commands @akala/server
ENV PATH=/akala/node_modules/.bin:${PATH}
ENV NODE_ENV=production
ENV DEBUG=*
RUN akala --configFile=file:///akala/db/.akala.json plugins add @akala/config/akala && \
    akala --configFile=file:///akala/db/.akala.json plugins add @akala/commands/akala && \
    akala --configFile=file:///akala/db/.akala.json plugins add @akala/pm/akala && \
    akala --configFile=file:///akala/db/.akala.json plugins add @akala/server/akala
ENTRYPOINT ["yarn", "start"]
CMD [ "tcp", "--tcpPort=31416"]
EXPOSE 31416
