FROM npenin/akala
ARG PACKAGE
ENV pmSOCK '/usr/src/akala/pm.sock'
RUN ["yarn", "add", PACKAGE]
ENTRYPOINT ["yarn" ,"pm-fork", PACKAGE]
CMD ["local", "tcp", "--tcpPort=31416", "--pmSock="+pmSOCK]
EXPOSE 31416
# VOLUME /root 