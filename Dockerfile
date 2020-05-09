FROM mhart/alpine-node
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY package.docker.json package.json
RUN npm i -g yarn
RUN yarn set version berry
RUN yarn install
ENTRYPOINT ["yarn" ,"pm-fork", "pm"] 
CMD ["local", "tcp"]