FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/akala
# RUN npm i -g yarn
COPY package.json package.json
RUN mkdir /root/.yarn && ln -s /usr/src/akala/.yarn /root/.yarn
VOLUME ["/usr/src/akala/build"]
WORKDIR /usr/src/akala
RUN ["yarn", "set", "version", "berry"]
RUN ["yarn", "config", "set", "nodeLinker", "node-modules"]
RUN ["yarn"]
ENV PATH=/usr/src/akala/node_modules/.bin:${PATH}
ENV NODE_ENV=production
ENV DEBUG=*
RUN ["node", "/usr/src/akala/node_modules/.bin/akala", "plugins", "add", "@akala/config/akala"]
RUN ["node", "/usr/src/akala/node_modules/.bin/akala", "plugins", "add", "@akala/commands/akala"]
RUN ["node", "/usr/src/akala/node_modules/.bin/akala", "plugins", "add", "@akala/pm/akala"]
ENTRYPOINT ["node", "/usr/src/akala/node_modules/.bin/akala", "pm", "start", "pm", "--keepAttached"]
CMD [ "tcp", "--tcpPort=31416"]
EXPOSE 31416