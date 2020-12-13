FROM node:current-alpine3.12
ENV NODE_ENV production
WORKDIR /usr/src/akala
# RUN npm i -g yarn
COPY package.json package.json
RUN mkdir /root/.yarn && ln -s /usr/src/akala/.yarn /root/.yarn
WORKDIR /usr/src/akala
VOLUME ["/usr/src/akala/build"]
RUN ["yarn"]
ENTRYPOINT ["yarn" ,"pm-fork", "pm"]
CMD ["local", "tcp", "--tcpPort=31416"]
EXPOSE 31416