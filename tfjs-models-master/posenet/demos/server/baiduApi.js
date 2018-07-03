
let express = require('express');
let app = express();
let usersql = require('../DB/usersql')
let newUserSql = require('../DB/newUserSql')
let facepicSql = require('../DB/facepicSql')
let oldUserSql = require('../DB/oldUserSql')
let db = require("../DB/DBConfig");
let bodyParser = require('body-parser')
let cors = require('cors')
const fs = require('fs');
let date = new Date()


let AipFaceClient = require("baidu-aip-sdk").face;
let AipSpeechClient = require("baidu-aip-sdk").speech;

// 设置人脸识别APPID/AK/SK
const APP_ID = "11202945";
const API_KEY = "ktG61fsnUPgAMIhxhEr9XpZE";
const SECRET_KEY = "BpXsIsaWzdednwIzLPKquOS7y7SXQBMr";

//设置百度语音APPID/AK/SK
const SPEECH_APP_ID = "11478030";
const SPEECH_API_KEY = "52jloTvSKSdlNDt0NPzuWEP2";
const SPEECH_SECRET_KEY = "TsLTMXa2o2Lxfnme90myrQ7WyQLofxbL";

// 新建一个对象，建议只保存一个对象调用服务接口
let client = new AipFaceClient(APP_ID, API_KEY, SECRET_KEY);
var speechClient = new AipSpeechClient(SPEECH_APP_ID, SPEECH_API_KEY, SPEECH_SECRET_KEY);
const imageType = "BASE64";
const groudId = "groupOne"
const PORT = 3000
const TEMP_SRC = process.cwd()+"/temp"

// app.all('*', function (req, res, next) {
//     res.header("Access-Control-Allow-Origin",
//         "*");
//     res.header("origin","*");
//     res.header('Access-Control-Allow-Methods',
//         'PUT,GET,POST,DELETE,OPTIONS');
//     res.header("Access-Control-Allow-Headers",
//         "X-Requested-With");
//     res.header('Access-Control-Allow-Headers',
//         'Content-Type');
//     next();
// });

app.use(cors())
app.use('/facePic', facepicSql);
app.use('/user', usersql);
app.use('/newUser', newUserSql);
app.use('/oldUser', oldUserSql);
app.use(bodyParser({limit: '50mb'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))


app.post("/getBlob", function(req, res, next) {
    res.send("")
})

app.post("/faceDetect", function(req, res, next) {
    if (req.body.base64 !== undefined ) {
        let image = req.body.base64
        let reqImage
        if (image.indexOf('base64,') !== -1) {
            reqImage = image.split('base64,')[1]
        } else {
            reqImage = image;
        }
        reqImage = reqImage.split(' ').join('+')

        let detectOptions = {};
        detectOptions["face_type"] = "LIVE";
        detectOptions["max_face_num"] = "1";
        detectOptions["face_field"] = "age,beauty,expression,faceshape,gender,glasses,race,quality,facetype";

        if (reqImage) {
            client.detect(reqImage, imageType, detectOptions).then(function (result) {
                // console.log(JSON.stringify(result));
                // console.log(reqImage, imageType, options)
                if (result.result !== null && result.result !== undefined){
                    if (
                        parseFloat(result.result.face_list[0].quality.occlusion.left_eye) < 0.2 &&
                        parseFloat(result.result.face_list[0].quality.occlusion.right_eye) < 0.2 &&
                        parseFloat(result.result.face_list[0].quality.occlusion.nose) < 0.2 &&
                        parseFloat(result.result.face_list[0].quality.occlusion.mouth) < 0.5 &&
                        parseFloat(result.result.face_list[0].quality.occlusion.left_cheek) < 0.5 &&
                        parseFloat(result.result.face_list[0].quality.occlusion.right_cheek) < 0.5 &&
                        parseFloat(result.result.face_list[0].quality.occlusion.chin_contour) < 0.6 &&
                        result.result.face_list[0].quality.illumination > 80 &&
                        parseFloat(result.result.face_list[0].quality.blur) < 0.2 &&
                        result.result.face_list[0].quality.completeness === 1
                    ) {
                        res.json(result)
                    } else {
                        res.json({"error_msg": "ERROR"})
                    }
                }
            }).catch(function (err) {
                // 如果发生网络错误
                console.log(err);
            });
        }
    } else {
        res.json({"error_msg": "ERROR PICTURE"})
    }

});

app.post("/faceGroupAddUser", function(req, res, next) {
    if (req.body.base64 !== undefined ) {
        let image = req.body.base64
        let id = req.body.insertId
        let reqImage
        if (image.indexOf('base64,') !== -1) {
            reqImage = image.split('base64,')[1]
        } else {
            reqImage = image;
        }
        reqImage = reqImage.split(' ').join('+')

        let userId = date.getTime().toString() + id

        let addUserOptions = {};
        addUserOptions["quality_control"] = "NORMAL";
        addUserOptions["liveness_control"] = "LOW";
// 调用人脸注册
        client.addUser(reqImage, imageType, groudId, userId, addUserOptions).then(function (result) {
            result.uid = userId
            if (result.result !== null && result.result !== undefined){
                // console.log(JSON.stringify(result));

                res.json(result)
            } else {
                res.json({"error_msg": "ERROR"})
            }

        }).catch(function (err) {
            // 如果发生网络错误
            console.log(err);
        });

    }

});

app.post("/faceSearch", function(req, res, next) {
    if (req.body.base64 !== undefined ) {
        let image = req.body.base64
        let reqImage
        if (image.indexOf('base64,') !== -1) {
            reqImage = image.split('base64,')[1]
        } else {
            reqImage = image;
        }
        reqImage = reqImage.split(' ').join('+')


        let options = {};
        options["quality_control"] = "NORMAL";
        options["liveness_control"] = "LOW";
        options["max_user_num"] = "1";

        client.search(reqImage, imageType, groudId, options).then(function(result) {
            // console.log(JSON.stringify(result));
            res.json(result)
        }).catch(function(err) {
            // 如果发生网络错误
            console.log(err);
        });

    }

});

app.post('/upload', function(req, res){
    let image = req.body.image;
    let tmpName = req.body.insertId;
    let fileName =  req.host + ':8080' + "/"+ tmpName +".png"
    //过滤data:URL
    console.log(req.host)
    let base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    let dataBuffer = new Buffer(base64Data, 'base64');
    fs.writeFile(fileName, dataBuffer, function(err) {
        res.send({
            "result": {
                "picName": tmpName + ".png",
                "picSrc": fileName,
            }

        })
    });
});

app.get("/getFaceList", function(req, res, next) {
    db.query("select * from olduser, facepic where olduser.faceId = facepic.faceId",function(err,rows){
        res.send(rows)
    });
});

app.post("/uploadSpeech", function(req, res) {
    let voicectx = req.body.image;
    speechClient.text2audio(voicectx, {spd: 5, pit: 6, vol: 6, per: 0}).then(function(result) {
        if (result.data) {
            fs.writeFileSync('temp/mp3/welcomeVoice.mp3', result.data);
            res.json({
                "error_msg": "SUCCESS"
            })
        } else {
            // 服务发生错误
            console.log(result)
        }
    }, function(e) {
        // 发生网络错误
        console.log(e)
    });
});



let server = app.listen(PORT, function () {
    let host = server.address().address;
    let port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});

