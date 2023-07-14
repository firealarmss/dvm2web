/*
    Caleb, KO4UYJ
    Send DVMFNE2 audio to a webpage in a fancy xtl format
*/
import dgram from 'dgram';
import fetch from 'node-fetch';
import express from 'express';
import ping from 'ping';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import yaml from "js-yaml";
import logger from "./logger.js";
import { Command } from 'commander';
import * as path from "path";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const udpSocket = dgram.createSocket('udp4');

let lastheard;

let httpPort = 3000;
let udpRxPort = 34001;
let udpRxAddress = "127.0.0.1";
let httpAddress = "0.0.0.0";
let noCommsHost = "127.0.0.1";
let webHookUrl = "";
let dstTg = 1;
let debug = false;
let tgAliasFile = "tg_alias.yml";

const program = new Command();

program
    .version('1.5.0')
    .description('DVM2WEB')
    .option('-c, --config <config>', 'Specify the config file')
    .parse(process.argv);

let { config } = program.opts();
console.log(config)
if (!config){
    logger.error(`Required command line option '-c, --config' not used`);
    process.exit(0)
}
if (debug){
    config = "./config.yml";
}
try {
    fs.readFile(config, 'utf8', function (err, data) {
        if (debug) {
            logger.debug(`Config File Info: \n${data}`);
        }
        logger.info(`Read config file: ${config}`);
        let obj = yaml.load(data);
        // console.log(obj.udpRxAddress);
        httpPort = obj.httpPort;
        udpRxPort = obj.udpRxPort;
        udpRxAddress = obj.udpRxAddress;
        httpAddress = obj.httpAddress;
        noCommsHost = obj.noCommsHost;
        webHookUrl = obj.webHookUrl;
        dstTg = obj.dstTg;
        debug = obj.debug;
        logger.info(
            "Config Values:" +
            `\n     HTTP Port: ${httpPort}` +
            `\n     UDP RX Port: ${udpRxPort}` +
            `\n     UDP RX Address: ${udpRxAddress}` +
            `\n     HTTP Address: ${httpAddress}` +
            `\n     WebHook URL: ${webHookUrl}` +
            `\n     dstTg: ${dstTg}` +
            `\n     Debug: ${debug}`
        );
    });
} catch (err){
    logger.error(`Error reading config file   ${err}`)
}
//TODO: Make this work
/*try {
    fs.readFile(tgAliasFile, 'utf8', function (err, data2) {
        if (debug) {
            logger.debug(`TG Alias File Info: \n${data}`);
        }
        logger.info(`Read TG Alias file: ${tgAliasFile}`);
        let obj = yaml.load(data2);
        // console.log(obj.udpRxAddress);
        httpPort = obj.httpPort;

        for (let i = 0; i < data2.length; i++) {
            const entry = data2[i];
            const tgId = entry.tg_id;
            const alias = entry.alias;
            console.log(`TG ID: ${tgId}, Alias: ${alias}`);
        }
        //
        // logger.info(
        //     "Config Values:" +
        //     `\n     HTTP Port: ${httpPort}`
        // );
    });
} catch (err){
    logger.error(`Error reading config file   ${err}`)
}*/
app.set("views", path.join("../views"));
app.set('view engine', 'ejs');
app.use('/public', express.static('src/public'))

app.get('/', (req, res) => {
   // res.sendFile(__dirname + "/index.html");
    res.render('index', {dstTg: dstTg});
});
// io.on("connection",function(socket){
//     socket.emit('connection');
// });
let isReceivingMessage;
udpSocket.on('message', (message) => {
    const srcId = (message[message.length - 4] << 8) | message[message.length - 3];
    const dstId = (message[message.length - 2] << 8) | message[message.length - 1];
    if (debug) {
        logger.info(`Received voice traffic: SRC_ID: ${srcId}, DST_ID: ${dstId}`);
    }

    const audioData = message.slice(0, message.byteLength - 4);
    lastheard = srcId;

    io.emit("channelAudio", JSON.stringify({
        "audio": audioData,
        "dstId": dstId,
        "srcId": srcId
    }));
    isReceivingMessage = false;
});
udpSocket.once('message', (message) => {
    const srcId = (message[message.length - 4] << 8) | message[message.length - 3];
    const dstId = (message[message.length - 2] << 8) | message[message.length - 1];

        // Send message to Discord webhook
        let params = {
            username: "Centrunk Last Heard",
            avatar_url: "",
            content: `Transmission started: SRC_ID: ${srcId}, DST_ID: ${dstId}`
        }

        fetch(webHookUrl, {
            method: "POST",
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify(params)
        }).catch(err =>{
            logger.error(`Fail to send webhook message`)
            if (debug){
                logger.debug(err);
            }
        });
});
//Future additions
let ignore_peers = [
    1,
    9026
]
io.on("connection",function (socket){
    socket.on("EMERG", function(msg){
        logger.debug(msg.dstId);
        if (!ignore_peers.includes(msg)) {
            io.emit("EMERG", {srcId: msg.srcId, dstId: msg.dstId});
        }
    });
});
function pingDevice(host) {
    return new Promise((resolve) => {
        ping.sys.probe(host, (isAlive) => {
            resolve(isAlive);
        });
    });
}

//Future support to maybe add a tad of whackerness to the front end XTL. comment out if the messages get annoying
const host = noCommsHost;
setInterval(function (){
    pingDevice(host)
        .then((isAlive) => {
            if (isAlive) {
                io.emit('noComms', false);
                logger.info(`Device at ${host} is reachable.`);
            } else {
                io.emit('noComms', true);
                logger.warn(`Device at ${host} is not reachable.`);
            }
        })
        .catch((error) => {
           logger.error(`Error with no comms ping`);
           if (debug){
               logger.debug(error);
           }
        });
}, 10000);

server.listen(httpPort, httpAddress, () => {
    if (debug) {
        logger.warn('Debug mode enabled');
    }
    logger.info(`HTTP Listening on ${httpAddress}:${httpPort}`);
});
udpSocket.bind(udpRxPort, udpRxAddress,() => {
    logger.info(`Listening for DVM data on ${udpRxAddress}:${udpRxPort}`);
});