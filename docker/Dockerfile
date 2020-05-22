FROM mhart/alpine-node
ENV NODE_ENV production
WORKDIR /usr/src/domojs
RUN npm i -g yarn
COPY package.json package.json
RUN mkdir /root/.yarn && ln -s /usr/src/domojs/.yarn /root/.yarn
RUN ["yarn"]
ENTRYPOINT ["yarn" ,"pm-fork", "pm"] 
CMD ["local", "tcp", "--tcpPort=31416"]
EXPOSE 31416
VOLUME /root 