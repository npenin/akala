FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/akala
# RUN npm i -g yarn
COPY package.json package.json
# COPY ash.sh /usr/bin/ash-env
RUN mkdir /root/.yarn && ln -s /usr/src/akala/.yarn /root/.yarn
VOLUME ["/usr/src/akala/build"]
WORKDIR /usr/src/akala
RUN adduser -S akala && \
    chown -R akala .
USER akala
RUN yarn set version berry && \
    yarn config set nodeLinker node-modules && \
    yarn add @akala/pm
ENV PATH=/usr/src/akala/node_modules/.bin:${PATH}
ENV NODE_ENV=production
ENV DEBUG=*
RUN akala plugins add @akala/config/akala && \
    akala plugins add @akala/commands/akala && \
    akala plugins add @akala/pm/akala
ENTRYPOINT ["yarn", "start"]
CMD [ "tcp", "--tcpPort=31416"]
EXPOSE 31416
