import { Platform } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import './UserAgent';
import io from 'socket.io-client';
import RNFetchBlob from 'rn-fetch-blob';


// const socket = io('ws://127.0.0.1:8000', { transport: ['websocket', 'polling'],jsonp: false, rejectUnauthorized:false, });
// const socket = io('ws://127.0.0.1:8000',
//     {
//         reconnection: true,
//         reconnectionDelay: 500,
//         reconnectionAttempts: Infinity,
//         transports: ['websocket'],
//     }
// );

const serverDomain = Platform.OS=='ios'?"ws://127.0.0.1:8000":"ws://192.168.1.114:8000";

const socket = io.connect(serverDomain, {
    transports: ['websocket'],
    reconnectionDelay: 1000,
    reconnection: true,
    reconnectionAttempts: 10,
    // transports: ['websocket'],
    agent: false, // [2] Please don't set this to true
    upgrade: false,
    rejectUnauthorized: false
});

const mySelfData = Platform.OS == 'ios' ? {
    userid: "100001",
    username: 'devfpy'
} : {
        userid: "100002",
        username: 'fanpingyang'
    }

// io(socket).on("connect_error", (error) => {
//     console.log("connect_error  ", error);
// })

socket.on('error', (error) => {
    console.log('error: ' + error)
})

//监听连接
socket.on('connect', () => {
    console.log('Chat Server Did Connected!');

    //用户登录
    loginChatServer();

});

//监听新用户登录
socket.on('login', function (o) {
    console.log("..... 登录成功！");
});

//监听用户退出
socket.on('logout', function (o) {
    console.log("..... 退出登录！");
});

//监听消息接收
socket.on('message', function (obj) {

    let msgByUserId = obj.userid;
    if (msgByUserId == mySelfData.userid) {
        // console.log("......... 我的消息已经发送", obj);
    }
    else {
        console.log("......... 接收到新消息", obj);

        //发送回执
        let toUserId = obj.toUserId;
        obj.toUserId = msgByUserId;
        obj.userid = toUserId;
        console.log("...... 发送回执", obj);
        socket.emit('messageReceived', obj);
    }

});

//监听消息发送回执
socket.on('messageReceived', function (obj) {
    if (obj.toUserId == mySelfData.userid) {
        console.log("......... 我的消息已经发送", obj);
        DeviceEventEmitter.emit('receiptMsg', obj);
    }

});

/**
 * 登录服务器
 */
export function loginChatServer() {
    socket.emit("login", { userid: mySelfData.userid, username: mySelfData.username });
}


/**
 * 发送消息
 * @param {*} type 消息类型
 * @param {*} msgObj 消息结构
 */
export function sendMessage(type, msgObj) {
    if (type == 'text') {
        console.log(msgObj);
        let msgId = msgObj.msgId;
        this.sendMessageText(msgId, msgObj.text, msgObj.toUser.userId);
    }
    else if (type == 'file') {
        console.log(msgObj);

        let msgId = msgObj.msgId;
        let mediaPath = msgObj.mediaPath;
        let msgType = msgObj.msgType;
        let msgToUserId = msgObj.toUser.userId;
        let mediaName = mediaPath.substr(mediaPath.lastIndexOf('/') + 1);
        this.sendMessageFile(msgId, mediaName, mediaPath, msgToUserId);
    }
}

/**
 * 发送文本消息
 * @param {*} msgId 
 * @param {*} msgContent 
 * @param {*} toUserId 
 */
export function sendMessageText(msgId, msgContent, toUserId) {
    var obj = {
        userid: mySelfData.userid,
        username: mySelfData.username,
        content: msgContent,
        toUserId: toUserId,
        msgId: msgId
    };

    socket.emit('messageTo', obj);
}

/**
 * 发送文件消息
 */
export function sendMessageFile(msgId, fileName, filePath, toUserId) {

    let data = '';

    var obj = {
        userid: mySelfData.userid,
        username: mySelfData.username,
        content: "",
        toUserId: toUserId,
        name: fileName,
        msgId: msgId
    };

    RNFetchBlob.fs.readStream(
        // file path
        filePath,
        // encoding, should be one of `base64`, `utf8`, `ascii`
        'base64',
        // (optional) buffer size, default to 4096 (4095 for BASE64 encoded data)
        // when reading file in BASE64 encoding, buffer size must be multiples of 3.
        4095)
        .then((ifstream) => {
            let chunkCount = 0;
            ifstream.open()
            ifstream.onData((chunk) => {
                // when encoding is `ascii`, chunk will be an array contains numbers
                // otherwise it will be a string
                // console.log("......... chunkCount = [" + chunkCount + "]");
                chunkCount++;
                data += chunk
            })
            ifstream.onError((err) => {
                console.log('oops', err)
            })
            ifstream.onEnd(() => {
                console.log("........ 文件读取完毕 ");
                socket.emit('fileTo', data, obj);
            })
        })

}