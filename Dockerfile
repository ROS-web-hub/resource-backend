
FROM node:18.12.1-bullseye-slim

ENV USER=nodejs
ENV USERID=6100
ENV GROUP=nodejs
ENV GROUPID=6100

# Create app directory
WORKDIR /home/$USER/app

# Install PM2
RUN npm install pm2 --global --quiet

# Add local user for security
RUN groupadd -g $USERID $USER
RUN useradd -g $USERID -l -m -s /bin/false -u $GROUPID $GROUP
RUN chown -R $USER:$GROUP /home/$USER

USER $USER
COPY package.json .
RUN npm install --production --quiet
RUN mkdir /home/$USER/logs

COPY . .
EXPOSE 3333

# Start Node server
CMD [ "npm", "run", "start:prod"]
