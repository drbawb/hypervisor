FROM node:latest

add . /app

run useradd --home-dir /app app
run chown -R app:app /app
run chmod -R 700 /app

user app
workdir /app

run rm -rf /app/node_modules
run npm install

cmd node /app/bot.js
