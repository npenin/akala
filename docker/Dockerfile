FROM node:lts-alpine
ENV NODE_ENV production
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
ENTRYPOINT ["yarn" ,"pm-fork", "node_modules/@akala/pm/commands.json", "pm"]
CMD ["local", "tcp", "--tcpPort=31416"]
EXPOSE 31416