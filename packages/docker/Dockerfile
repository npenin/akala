FROM node:lts-alpine
ENV NODE_ENV production
WORKDIR /usr/src/akala
# RUN npm i -g yarn
COPY package.json package.json
RUN mkdir /root/.yarn && ln -s /usr/src/akala/.yarn /root/.yarn
VOLUME ["/usr/src/akala/build"]
WORKDIR /usr/src/akala
RUN ["yarn"]
ENTRYPOINT ["yarn" ,"pm-fork", "pm"]
CMD ["local", "tcp", "--tcpPort=31416"]
EXPOSE 31416