FROM node:lts
ENV NODE_ENV production
WORKDIR /usr/src/app
ADD latest.tar.gz /usr/src
RUN mv /usr/src/yarn-v1.22.4 /usr/lib/yarn
ENV PATH "$PATH:/usr/lib/yarn/bin"
COPY package.docker.json package.json
RUN yarn install --production --silent
VOLUME /export
RUN ln -s pm.sock /export/pm.sock
CMD node node_modules/@akala/pm/dist/fork.js pm
EXPOSE 80
