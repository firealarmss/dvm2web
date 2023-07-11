/*
    Caleb, KO4UYJ
    Send DVMFNE2 audio to a webpage in a fancy xtl format
*/
const dgram = require('dgram');
const express = require('express');
const ping = require('ping');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const udpSocket = dgram.createSocket('udp4');



const udpPort = 34001;
const debug = true;

function logError(error){
    console.log(`LOG: ERROR: ${error}`);
}
function logWarning(warning){
    console.log(`LOG: WARNING: ${warning}`);
}
function logInfo(info){
    console.log(`LOG: INFO: ${info}`);
}

app.use('/public', express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
// io.on("connection",function(socket){
//     socket.emit('connection');
// });
udpSocket.on('message', (message) => {
    const srcId = (message[message.length - 4] << 8) | message[message.length - 3];
    const dstId = (message[message.length - 2] << 8) | message[message.length - 1];
    if (debug) {
        logInfo(`Received voice traffic: SRC_ID: ${srcId}, DST_ID: ${dstId}`);
    }
    const audioData = message.slice(0, message.byteLength - 4);

    io.emit("channelAudio", JSON.stringify({
        "audio": audioData,
        "dstId": dstId,
        "srcId": srcId
    }));
});
function pingDevice(host) {
    return new Promise((resolve, reject) => {
        ping.sys.probe(host, (isAlive) => {
            resolve(isAlive);
        });
    });
}

//Future support to maybe add a tad of whackerness to the front end XTL. comment out of the messages get annoying
const host = '192.168.1.111';
setInterval(function (){
    pingDevice(host)
        .then((isAlive) => {
            if (isAlive) {
                io.emit('noComms', false);
                logInfo(`Device at ${host} is reachable.`);
            } else {
                io.emit('noComms', true);
                logWarning(`Device at ${host} is not reachable.`);
            }
        })
        .catch((error) => {
            logInfo('An error occurred:', error);
        });
}, 10000);

server.listen(3000, () => {
    logInfo('listening on *:3000');
});

udpSocket.bind(udpPort, () => {
    logInfo(`Listening for DVM data on: ${udpPort}`);
});