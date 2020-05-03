FROM node:lts
ENV NODE_ENV production
WORKDIR /usr/src/app
ADD https://yarnpkg.com/latest.tar.gz /usr/src
RUN mkdir /usr/lib/yarn
RUN tar -C /usr/lib/yarn --strip-components=1 -xf /usr/src/latest.tar.gz
ENV PATH "$PATH:/usr/lib/yarn/bin:/usr/src/app/node_modules/.bin"
COPY package.docker.json package.json
RUN yarn install --production --silent
COPY packages/pm node_modules/@akala/pm
VOLUME /export
ENTRYPOINT ["node", "node_modules/@akala/pm/dist/fork.js", "pm"] 
CMD ["local", "tcp"]
RUN ln -s pm.sock /export/pm.sock