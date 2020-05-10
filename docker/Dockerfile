FROM mhart/alpine-node
ENV NODE_ENV production
WORKDIR /usr/src/domojs
RUN npm i -g yarn
COPY package.json package.json
RUN ["yarn", "set", "version", "berry"]
RUN ["yarn"]
# ENTRYPOINT /bin/sh
ENTRYPOINT ["yarn" ,"pm-fork", "pm"] 
CMD ["local", "tcp", "--tcpPort=31416"]
EXPOSE 31416
VOLUME /usr/src/domojs