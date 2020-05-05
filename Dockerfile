FROM node:lts-slim
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY package.docker.json package.json
RUN yarn set version berry
RUN yarn install
ENTRYPOINT ["yarn" ,"pm-fork", "pm"] 
CMD ["local", "tcp"]