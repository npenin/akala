FROM alpine:3.16
ENV NODE_ENV production
RUN apk add --update nodejs nodejs-npm
USER 1000:1000
WORKDIR /usr/src/akala
COPY package.json package.json
RUN mkdir /root/.yarn && ln -s /usr/src/akala/.yarn /root/.yarn
VOLUME ["/usr/src/akala/build"]
WORKDIR /usr/src/akala
RUN ["yarn"]
ENTRYPOINT ["yarn" ,"pm-fork", "pm"]
CMD ["local", "tcp", "--tcpPort=31416"]
EXPOSE 31416